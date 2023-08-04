import { Database } from 'sqlite-async';
import { Controller, ControllerSubmission } from "./types.js";
import * as semver from "semver";

export const isSubmissionValid = (submission: ControllerSubmission): boolean =>
  !!submission.GUID && !!submission.productID && !!submission.reportedName && !!submission.vendorID && !!submission.controlifyVersion;

export async function getControllersFromDatabase(db: Database): Promise<Controller[]> {
  const controllers: Controller[] = [];

  try {
    const query = `
        SELECT *
        FROM Controllers
      `;

    const rows: any = await db.all(query);

    for (const row of rows) {
      const { VendorID, ProductID, GUID, ControllerID, ControlifyVersion, TimesSeen } = row;
      const reportedNamesQuery = `
          SELECT ReportedName, Operational
          FROM ReportedNames
          WHERE ControllerID = ?
        `;

      const reportedNamesRows = await db.all(reportedNamesQuery, ControllerID);
      let reportedNames = reportedNamesRows.map((reportedNameRow: any) => reportedNameRow.ReportedName);

      reportedNames = [...new Set(reportedNames)]

      const operationals = reportedNamesRows.map((reportedNamesRow: any) => reportedNamesRow.Operational);

      let totalOperational = 0;

      operationals.forEach(operational => {
        totalOperational += operational;
      });

      const totalOperationalPercentage = (totalOperational / operationals.length) * 100;

      const controller: Controller = {
        databaseID: ControllerID,
        vendorID: "0x" + VendorID.toString(16).toUpperCase(),
        productID: "0x" + ProductID.toString(16).toUpperCase(),
        GUID: GUID,
        reportedNames: reportedNames,
        lastSeenVersion: ControlifyVersion,
        timesSeen: TimesSeen,
        percentageOperational: totalOperationalPercentage
      };

      controllers.push(controller);
    }

    return controllers;
  } catch (error) {
    // Handle any potential errors
    throw error;
  }
}

export function getControllerIDIfExists(
  submission: ControllerSubmission,
  db: Database
): Promise<number | null> {
  return new Promise<number | null>(async (resolve, reject) => {
    const controllerQuery = `
      SELECT ControllerID
      FROM Controllers
      WHERE VendorID = ? AND ProductID = ? AND GUID = ?
    `;

    const result: any = await db.get(
      controllerQuery,
      submission.vendorID,
      submission.productID,
      submission.GUID
    );

    if (result == null || !result?.ControllerID) {
      resolve(null);
    } else {
      resolve(result.ControllerID);
    }
  });
}

export async function updateControlifyVersionForController(
  submission: ControllerSubmission,
  controllerID: number,
  db: Database
): Promise<void> {
  try {
    const query = `
      SELECT ControlifyVersion, TimesSeen
      FROM Controllers
      WHERE controllerID = ?
    `;

    const row: any = await db.get(query, controllerID);

    if (!row) {
      throw new Error(`Controller with ID ${controllerID} not found.`);
    }

    const currentVersionString = row?.ControlifyVersion ?? "0.0.0";
    const timesSeen = row?.TimesSeen ?? 0;

    if (semver.gt(submission.controlifyVersion, currentVersionString)) {
      const updateQuery = `
        UPDATE Controllers
        SET ControlifyVersion = ?,
            TimesSeen = ?
        WHERE ControllerID = ?
      `;

      await db.run(updateQuery, submission.controlifyVersion, timesSeen + 1, controllerID);
    } else {
      const updateQuery = `
        UPDATE Controllers
        SET TimesSeen = ?
        WHERE ControllerID = ?
      `

      await db.run(updateQuery, timesSeen + 1, controllerID);
    }
  } catch (error) {
    // Handle any potential errors
    console.log(error);
    throw error;
  }
}

export function isReportedNameDuplicate(
  submission: ControllerSubmission,
  db: Database
): boolean {
  return false;
}

interface ExistanceCheckResult {
  controllerID?: number;
  isDuplicate: boolean;
}

export async function checkExistance(
  submission: ControllerSubmission,
  db: Database
): Promise<ExistanceCheckResult> {
  try {
    const controllerID = await getControllerIDIfExists(submission, db);
    const isDuplicate = await isReportedNameDuplicate(submission, db);

    return {
      controllerID: controllerID ?? undefined,
      isDuplicate,
    };
  } catch (error) {
    // Handle any potential errors
    throw error;
  }
}

export function controllerAlreadyExists(
  submission: ControllerSubmission,
  db: Database
): Promise<Boolean> {
  return new Promise<Boolean>((resolve, reject) => { });
}

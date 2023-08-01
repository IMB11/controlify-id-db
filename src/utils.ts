import { Database } from 'sqlite-async';
import { Controller, ControllerSubmission } from "./types.js";

export const isSubmissionValid = (submission: ControllerSubmission): boolean =>
  !!submission.GUID && !!submission.productID && !!submission.reportedName && !!submission.vendorID;

export async function getControllersFromDatabase(db: Database): Promise<Controller[]> {
  const controllers: Controller[] = [];

  try {
    const query = `
        SELECT VendorID, ProductID, GUID, ControllerID
        FROM Controllers
      `;

    const rows: any = await db.all(query);

    for (const row of rows) {
      const { VendorID, ProductID, GUID, ControllerID } = row;
      const reportedNamesQuery = `
          SELECT ReportedName
          FROM ReportedNames
          WHERE ControllerID = ?
        `;

      const reportedNamesRows = await db.all(reportedNamesQuery, ControllerID);
      const reportedNames = reportedNamesRows.map((reportedNameRow: any) => reportedNameRow.ReportedName);

      const controller: Controller = {
        vendorID: VendorID,
        productID: ProductID,
        GUID: GUID,
        reportedNames: reportedNames,
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
  return new Promise<number | null>((resolve, reject) => {
    const controllerQuery = `
      SELECT controllerID
      FROM Controllers
      WHERE VendorID = ? AND ProductID = ? AND GUID = ?
    `;

    db.get(
      controllerQuery,
      submission.vendorID,
      submission.productID,
      submission.GUID,
      (controllerErr: any, controllerRow: any) => {
        if (controllerErr) {
          reject(controllerErr);
        } else {
          resolve(controllerRow ? controllerRow.ControllerID : null);
        }
      }
    );
  });
}

export function isReportedNameDuplicate(
  submission: ControllerSubmission,
  db: Database
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const reportedNameQuery = `
      SELECT COUNT(*) AS count
      FROM ReportedNames
      WHERE ReportedName = ?
    `;

    db.get(
      reportedNameQuery,
      submission.reportedName,
      (reportedNameErr: any, row: any) => {
        if (reportedNameErr) {
          reject(reportedNameErr);
        } else {
          const count = row.count;
          resolve(count > 0);
        }
      }
    );
  });
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

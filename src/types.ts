export interface Controller {
  databaseID: number,
  vendorID: string,
  productID: string,
  GUID: string,
  reportedNames: string[],
  lastSeenVersion: string,
  timesSeen: number
}

export interface APIResponse {
  message: string,
  data?: any,
  error?: boolean
}

export interface ControllerSubmission {
  vendorID: number,
  productID: number,
  GUID: string,
  reportedName: string,
  controlifyVersion: string
}
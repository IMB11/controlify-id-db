export interface Controller {
  databaseID: number,
  vendorID: number,
  productID: number,
  GUID: string,
  reportedNames: string[],
  lastSeenVersion: string
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
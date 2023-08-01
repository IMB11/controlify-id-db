export interface Controller {
  vendorID: number,
  productID: number,
  GUID: string,
  reportedNames: string[]
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
  reportedName: string
}
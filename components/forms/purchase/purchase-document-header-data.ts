export interface PurchaseCommonHeaderFormData {
  vendorNo: string;
  vendorName: string;
  purchasePersonCode: string;
  locationCode: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  invoiceType: string;
  lob: string;
  branch: string;
  poType: string;
  serviceType: string;
  vendorGstRegNo: string;
  vendorPanNo: string;
  brokerNo: string;
  brokerName: string;
  brokerageRate: string;
  orderAddressCode: string;
  rateBasis: string;
  termCode: string;
  mandiName: string;
  paymentTermCode: string;
  dueDateCalculation: string;
  creditorType: string;
  qcType: string;
  dueDate: string;
  vehicleNo: string;
  appliesToDocType: string;
  appliesToDocNo: string;
  appliesToID: string;
  SFPL_User_ID?: string;
}

export function buildPurchaseCommonHeaderData(
  formData: PurchaseCommonHeaderFormData,
) {
  return {
    vendorNo: formData.vendorNo,
    vendorName: formData.vendorName,
    purchasePersonCode: formData.purchasePersonCode,
    locationCode: formData.locationCode,
    postingDate: formData.postingDate,
    documentDate: formData.documentDate,
    orderDate: formData.orderDate,
    invoiceType: formData.invoiceType,
    lob: formData.lob,
    branch: formData.branch,
    poType: formData.poType,
    serviceType: formData.serviceType,
    vendorGstRegNo: formData.vendorGstRegNo,
    vendorPanNo: formData.vendorPanNo,
    brokerNo: formData.brokerNo,
    brokerName: formData.brokerName,
    brokerageRate: formData.brokerageRate,
    orderAddressCode: formData.orderAddressCode,
    rateBasis: formData.rateBasis,
    termCode: formData.termCode,
    mandiName: formData.mandiName,
    paymentTermCode: formData.paymentTermCode,
    dueDateCalculation: formData.dueDateCalculation,
    creditorType: formData.creditorType,
    qcType: formData.qcType === "_none" ? "" : formData.qcType,
    dueDate: formData.dueDate,
    vehicleNo: formData.vehicleNo,
    appliesToDocType: formData.appliesToDocType,
    appliesToDocNo: formData.appliesToDocNo,
    appliesToID: formData.appliesToID,
    SFPL_User_ID: formData.SFPL_User_ID,
  };
}

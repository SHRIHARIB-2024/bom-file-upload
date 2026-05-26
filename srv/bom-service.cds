using { upload.bom as db } from '../db/schema';

service BomService @(path: '/odata/v4/bom') {
  entity BomHeaders as projection on db.BomHeaders;
  entity BomItems as projection on db.BomItems;

  type UploadResult {
    success  : Boolean;
    message  : String(255);
    inserted : Integer;
  }

  action uploadBom(
    material       : String(40),
    plant          : String(4),
    bomUsage       : String(1),
    alternativeBom : String(2),
    fileName       : String(120),
    csvContent     : String
  ) returns UploadResult;
}

namespace upload.bom;

using { cuid, managed } from '@sap/cds/common';

entity BomHeaders : cuid, managed {
  material       : String(40);
  materialText   : String(120);
  plant          : String(4);
  plantName      : String(80);
  bomUsage       : String(1);
  alternativeBom : String(2);
  validFrom      : Date;
  revisionLevel  : String(2);
  changeNumber   : String(12);
  items          : Composition of many BomItems on items.parent = $self;
}

entity BomItems : cuid, managed {
  parent               : Association to BomHeaders;
  itemNo               : String(4);
  component            : String(40);
  componentDescription : String(120);
  quantity             : Decimal(13, 3);
  unit                 : String(3);
  validFrom            : Date;
  validTo              : Date;
  changeNumber         : String(12);
  sortString           : String(20);
  itemId               : String(12);
  source               : String(12);
}

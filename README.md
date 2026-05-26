# Upload Bill of Material

This project is a CAP service with a SAPUI5/Fiori app for the flow shown in the screenshot:

1. Search/open **Upload Bill of Material** as a separate Fiori app tile.
2. Enter an existing material, plant, BOM usage, and alternative BOM.
3. Review the read-only BOM header and current line items.
4. Upload additional BOM line items from CSV and save them to the CAP persistence.

## Local Run

```powershell
npm install
npm run deploy:sqlite
npm start
```

Open:

```text
http://localhost:4004/upload-bom/webapp/index.html
```

Use the demo material:

```text
Material: 3000000814
Plant: 1001
BOM Usage: 1
Alternative BOM: 01
```

A sample upload file is available at `samples/bom-upload-template.csv`.

## CSV Format

Required column:

```text
component
```

Supported columns:

```text
component,description,quantity,unit,validFrom,validTo,changeNumber,sortString,itemId
```

## BTP Trial Deployment

Prerequisites in the BTP Trial subaccount:

- Cloud Foundry environment enabled with available memory quota.
- SAP HANA Cloud instance running.
- Entitlements for `hana` / `hdi-shared`, `xsuaa` / `application`, and `html5-apps-repo` / `app-host`.
- Cloud Foundry CLI and MultiApps plugin available.

Commands:

```powershell
npm install
cf api https://api.cf.<region>.hana.ondemand.com
cf login
cf target -o <org> -s <space>
npx mbt build
cf deploy mta_archives/upload-bill-of-material_1.0.0.mtar
```

After deployment, create a launchpad/work zone content entry for semantic object `BillOfMaterial` and action `upload`. The app manifest already exposes the inbound:

```text
BillOfMaterial-upload
```

That gives users a separate searchable app/tile named **Upload Bill of Material**, similar to **Create Bill of Material** or **Change Bill of Material**.

## Notes for S/4HANA Integration

This sample persists uploaded line items in CAP. For a real S/4HANA update, replace the insert logic in `srv/bom-service.js` with a call to the approved S/4HANA BOM API/BAPI through a BTP Destination and Cloud Connector. Keep the same UI flow, but commit the uploaded items to S/4HANA instead of the local CAP table.

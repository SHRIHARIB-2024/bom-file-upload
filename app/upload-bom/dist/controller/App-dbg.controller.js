sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("upload.bom.app.controller.App", {
    onInit: function () {
      this._model = new JSONModel({
        selection: {
          material: "3000000814",
          plant: "1001",
          bomUsage: "1",
          alternativeBom: "01",
          validFrom: "2026-05-15",
          revisionLevel: ""
        },
        headerVisible: false,
        header: {},
        items: [],
        itemsCount: 0,
        fileName: "",
        fileContent: "",
        canUpload: false
      });
      this.getView().setModel(this._model, "view");
    },

    onAfterRendering: function () {
      var fileInput = document.getElementById("bomCsvFile");
      if (fileInput && !fileInput.dataset.bound) {
        fileInput.dataset.bound = "true";
        fileInput.addEventListener("change", this._readFile.bind(this));
      }
    },

    onMaterialHelp: function () {
      MessageToast.show("Use an existing material number, for example 3000000814.");
    },

    onLoadBom: async function () {
      var selection = this._model.getProperty("/selection");
      if (!selection.material || !selection.plant || !selection.bomUsage) {
        MessageBox.warning("Enter Material, Plant, and BOM Usage before loading BOM details.");
        return;
      }

      var filter = [
        "material eq '" + encodeURIComponent(selection.material) + "'",
        "plant eq '" + encodeURIComponent(selection.plant) + "'",
        "bomUsage eq '" + encodeURIComponent(selection.bomUsage) + "'",
        "alternativeBom eq '" + encodeURIComponent(selection.alternativeBom || "01") + "'"
      ].join(" and ");

      try {
        var headerResponse = await fetch("/odata/v4/bom/BomHeaders?$filter=" + filter + "&$top=1");
        var headerData = await headerResponse.json();
        var header = headerData.value && headerData.value[0];

        if (!header) {
          MessageBox.information("No existing BOM found. You can upload items and the app will create a new upload header.");
          this._model.setProperty("/header", selection);
          this._model.setProperty("/items", []);
          this._model.setProperty("/itemsCount", 0);
          this._model.setProperty("/headerVisible", true);
          return;
        }

        var itemResponse = await fetch("/odata/v4/bom/BomItems?$filter=parent_ID eq " + header.ID + "&$orderby=itemNo");
        var itemData = await itemResponse.json();

        this._model.setProperty("/header", header);
        this._model.setProperty("/items", itemData.value || []);
        this._model.setProperty("/itemsCount", (itemData.value || []).length);
        this._model.setProperty("/headerVisible", true);
      } catch (error) {
        MessageBox.error("Could not load BOM details. " + error.message);
      }
    },

    onChooseFile: function () {
      var fileInput = document.getElementById("bomCsvFile");
      if (fileInput) fileInput.click();
    },

    onUpload: async function () {
      var selection = this._model.getProperty("/selection");
      var fileContent = this._model.getProperty("/fileContent");

      try {
        var response = await fetch("/odata/v4/bom/uploadBom", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            material: selection.material,
            plant: selection.plant,
            bomUsage: selection.bomUsage,
            alternativeBom: selection.alternativeBom || "01",
            fileName: this._model.getProperty("/fileName"),
            csvContent: fileContent
          })
        });

        var result = await response.json();
        if (!response.ok) {
          throw new Error(result.error && result.error.message || "Upload failed.");
        }

        MessageBox.success(result.message || "BOM uploaded successfully.");
        this._model.setProperty("/fileName", "");
        this._model.setProperty("/fileContent", "");
        this._model.setProperty("/canUpload", false);
        await this.onLoadBom();
      } catch (error) {
        MessageBox.error(error.message);
      }
    },

    onSave: function () {
      MessageToast.show("BOM upload is already saved in the CAP service.");
    },

    onCancel: function () {
      this._model.setProperty("/headerVisible", false);
    },

    _readFile: function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (loadEvent) {
        this._model.setProperty("/fileName", file.name);
        this._model.setProperty("/fileContent", loadEvent.target.result);
        this._model.setProperty("/canUpload", true);
      }.bind(this);
      reader.readAsText(file);
    }
  });
});

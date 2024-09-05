sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/Fragment"
    ],
    function (BaseController, Fragment) {
        "use strict";

        return BaseController.extend("com.app.parkinglotsrv.controller.BaseController", {
            onInit: function () {

            },
            //Performing curd operations
            createData: function (oModel, oPayload, sPath) {
                debugger
                return new Promise((resolve, reject) => {
                    oModel.create(sPath, oPayload, {
                        refreshAfterChange: true,
                        success: function (oSuccessData) {
                            resolve(oSuccessData);
                        },
                        error: function (oErrorData) {
                            reject(oErrorData)
                        }
                    })
                })
            },
            deleteData: function (oModel, sPath, ID) {
                debugger
                return new Promise((resolve, reject) => {
                    oModel.remove(`${sPath}('${ID}')`, {
                        refreshAfterChange: true,
                        success: function (oSuccessData) {
                            resolve(oSuccessData);
                        },
                        error: function (oErrorData) {
                            reject(oErrorData)
                        }
                    })
                })
            },
            loadFragment: async function (sFragmentName) {
                const oFragment = await Fragment.load({
                  id: this.getView().getId(),
                  name: `com.app.parkinglotsrv.fragment.${sFragmentName}`,
                  controller: this
                });
                this.getView().addDependent(oFragment);
                return oFragment
              }
        });
    }
);
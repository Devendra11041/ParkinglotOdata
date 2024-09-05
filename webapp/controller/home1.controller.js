sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/format/DateFormat",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
],
	function (Controller, JSONModel, Fragment, Filter, FilterOperator, DateFormat, ODataModel, MessageBox, MessageToast) {
		"use strict";


		return Controller.extend("com.app.parkinglotsrv.controller.home1", {
			onInit: function () {
				var oModel = new JSONModel(sap.ui.require.toUrl("com/app/parkinglotsrv/model/data.json"));
				this.getView().setModel(oModel);

				var oModel = this.getOwnerComponent().getModel();
				this.getView().byId("page4").setModel(oModel);

				if (oModel) {
					this.getView().byId("pageContainer").setModel(oModel);
				}

				this._setParkingLotModel();
				this.loadParkingLots();
				this._setHistoryModel();


				const oLocalModel = new JSONModel({
					VehicalDeatils: {
						Vehicleno: "",
						Drivername: "",
						Driverphno: "",
						Vehicletype: "",
						Intime: "",
						Outtime: "",
						Parkinglot: "",
					},
					plotNo: {
						available: false
					}
				});
				this.getView().setModel(oLocalModel, "localModel");

			},
			onItemSelect: function (oEvent) {
				var oItem = oEvent.getParameter("item");
				this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
			},

			onSideNavButtonPress: function () {
				var oToolPage = this.byId("toolPage");
				var bSideExpanded = oToolPage.getSideExpanded();

				this._setToggleButtonTooltip(bSideExpanded);

				oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
			},

			_setToggleButtonTooltip: function (bLarge) {
				var oToggleButton = this.byId('sideNavigationToggleButton');
				if (bLarge) {
					oToggleButton.setTooltip('Large Size Navigation');
				} else {
					oToggleButton.setTooltip('Small Size Navigation');
				}
			},
			onExit: function () {
				Device.media.detachHandler(this._handleMediaChange, this);
			},
			onServiceTypeChange: function (oEvent) {
				// Get the selected service type from the dropdown
				var sServiceType = oEvent.getSource().getSelectedKey();

				// Get the reference to the slots dropdown (Combobox)
				var oSlotsComboBox = this.getView().byId("idparkingLotSelect");

				// Create filters based on selected service type and available status
				var aFilters = [
					new sap.ui.model.Filter("Processtype", sap.ui.model.FilterOperator.EQ, sServiceType),
					new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "AVAILABLE")
				];

				// Apply the filters to the items aggregation of the slots dropdown
				oSlotsComboBox.bindAggregation("items", {
					path: "/ZEWM_PARKINGLOT_SERVICESet",
					template: new sap.ui.core.Item({
						key: "{Parkingno}",
						text: "{Parkingno}"
					}),
					filters: aFilters
				});
			},
			_setParkingLotModel: function () {
				var oModel = this.getOwnerComponent().getModel();
				var that = this;


				oModel.read("/ZEWM_PARKINGLOT_SERVICESet", {
					success: function (oData) {
						console.log("Fetched Data:", oData);
						var aItems = oData.results;
						var availableCount = aItems.filter(item => item.Status === "AVAILABLE").length;
						var occupiedCount = aItems.filter(item => item.Status === "Occupied").length;
						var reserveCount = aItems.filter(item => item.Status === "Reserved").length;


						var aChartData = {
							Items: [
								{
									Status: "AVAILABLE",
									Count: availableCount,
									Status: `AVAILABLE -${availableCount}`
								},
								{
									Status: "Occupied",
									Count: occupiedCount,
									Status: `Occupied -${occupiedCount}`
								},
								{
									Status: "Reserved",
									Count: reserveCount,
									Status: `Reserved -${reserveCount}`
								}
							]
						};
						var oParkingLotModel = new JSONModel();
						oParkingLotModel.setData(aChartData);
						that.getView().setModel(oParkingLotModel, "ParkingLotModel");
					},
					error: function (oError) {
						console.error(oError);
					}
				});
			},
			loadParkingLots: function () {
				var oModel = this.getOwnerComponent().getModel();
				var oParkingLotContainer = this.byId("parkingLotContainer");
				const that = this;

				oModel.read("/ZEWM_PARKINGLOT_SERVICESet", {
					success: function (oData) {
						var emptyCount = 0;
						var notEmptyCount = 0;
						var reservedCount = 0;

						oData.results.forEach(function (oPlot) {
							if (oPlot.Status === "AVAILABLE") {
								emptyCount++;
							} else if (oPlot.Status === "Occupied") {
								notEmptyCount++;
							} else if (oPlot.Status === "Reserved") {
								reservedCount++;
							}

							var oBox = new sap.m.VBox({
								width: "100px",
								height: "100px",
								alignItems: "Center",
								justifyContent: "Center",
								items: [
									new sap.m.Text({
										text: oPlot.Parkingno
									}),
									new sap.m.Text({
										text: oPlot.Processtype
									}),
									new sap.m.Link({
										text: oPlot.Status,
										press: () => {
											debugger
											if (oPlot.Status === "Reserved") {
												that._handleReservedLinkPress(oPlot.Parkingno);
											} else if (oPlot.Status === "Occupied") {
												that._handleOccupiedLinkPress(oPlot.Parkingno);
											}
										},
										enabled: oPlot.Status !== 'AVAILABLE'
									})
								]
							}).addStyleClass(
								oPlot.Status === "AVAILABLE" ? "greenBackground" :
									oPlot.Status === "Occupied" ? "redBackground" :
										"yellowBackground" // Reserved
							);

							oParkingLotContainer.addItem(oBox);
						}.bind(this));

						// Update the counts in the view
						this.byId("emptyCount").setText("(" + emptyCount + ")");
						this.byId("notEmptyCount").setText("(" + notEmptyCount + ")");
						this.byId("reservedCount").setText("(" + reservedCount + ")");
					}.bind(this),
					error: function (oError) {
						sap.m.MessageToast.show("Error fetching parking lot details.");
					}
				});
			},


			_handleOccupiedLinkPress: function (plotNum) {
				debugger
				var oModel = this.getOwnerComponent().getModel();
				var oView = this.getView();

				// Fetch vehicle details associated with the plot number
				oModel.read("/VehicledataSet", {
					filters: [
						new sap.ui.model.Filter("Parkinglot", sap.ui.model.FilterOperator.EQ, plotNum)
					],
					success: function (oData) {
						// Debug: Check the data returned
						console.log(oData);

						if (oData.results.length > 0) {
							var vehicle = oData.results[0];

							// Load the dialog fragment if it doesn't already exist
							if (!this._pVehicleDetailsDialog) {
								this._pVehicleDetailsDialog = Fragment.load({
									id: oView.getId(),
									name: "com.app.parkinglotsrv.fragment.data",
									controller: this
								}).then(function (oDialog) {
									oView.addDependent(oDialog);
									return oDialog;
								});
							}

							this._pVehicleDetailsDialog.then(function (oDialog) {
								// Create content dynamically
								var oVBox = oView.byId("dialogContentContainer");
								oVBox.removeAllItems();

								var createLabelValueHBox = function (labelText, valueText) {
									return new sap.m.HBox({
										alignItems: "Center",
										justifyContent: "Start",
										items: [
											new sap.m.Text({
												text: labelText,
												wrapping: false,
												class: "vehicleDetailsLabel"
											}),
											new sap.m.Text({
												text: valueText,
												wrapping: false,
												class: "vehicleDetailsValue"
											})
										]
									});
								};
								oVBox.addItem(createLabelValueHBox("Vehicle Number:", vehicle.Vehicleno));
								oVBox.addItem(createLabelValueHBox("Driver Name:", vehicle.Drivername));
								oVBox.addItem(createLabelValueHBox("Phone:", vehicle.Driverphno));
								oVBox.addItem(createLabelValueHBox("Vehicle Type:", vehicle.Vehicletype));
								oVBox.addItem(createLabelValueHBox("Assigned Date:", new Date(vehicle.Intime).toLocaleDateString()));

								oDialog.open();
							});
						} else {
							sap.m.MessageToast.show("No vehicle details found for the selected plot.");
						}
					}.bind(this),
					error: function (oError) {
						sap.m.MessageToast.show("Error fetching vehicle details: " + oError.message);
						console.error(oError); // Debug: Log error details
					}
				});
			},

			onCloseDialogPress: function () {
				this.byId("vehicleDetailsDialog").close();
			},
			_handleReservedLinkPress: function (plotNum) {
				var oModel = this.getOwnerComponent().getModel();
				var oView = this.getView();

				// Fetch vehicle details associated with the reserved plot number
				oModel.read("/ReservationdataSet", {
					filters: [
						new sap.ui.model.Filter("Parkinglot", sap.ui.model.FilterOperator.EQ, plotNum)
					],
					success: function (oData) {
						console.log(oData); // Debug: Check the data returned

						if (oData.results.length > 0) {
							var reservation = oData.results[0]; // Assuming plot number is unique and only one reservation is associated

							// Load the dialog fragment if it doesn't already exist
							if (!this._pVehicleDetailsDialog) {
								this._pVehicleDetailsDialog = Fragment.load({
									id: oView.getId(),
									name: "com.app.parkinglotsrv.fragment.data",
									controller: this
								}).then(function (oDialog) {
									oView.addDependent(oDialog);
									return oDialog;
								});
							}

							this._pVehicleDetailsDialog.then(function (oDialog) {
								// Create content dynamically
								var oVBox = oView.byId("dialogContentContainer");
								oVBox.removeAllItems();

								var createLabelValueHBox = function (labelText, valueText) {
									return new sap.m.HBox({
										alignItems: "Center",
										justifyContent: "Start",
										items: [
											new sap.m.Text({
												text: labelText,
												wrapping: false,
												class: "vehicleDetailsLabel"
											}),
											new sap.m.Text({
												text: valueText,
												wrapping: false,
												class: "vehicleDetailsValue"
											})
										]
									});
								};
								oVBox.addItem(createLabelValueHBox("Vehicle Number:", reservation.Vehicleno));
								oVBox.addItem(createLabelValueHBox("Driver Name:", reservation.Drivername));
								oVBox.addItem(createLabelValueHBox("vendor Name:", reservation.Vendorname));
								oVBox.addItem(createLabelValueHBox("Phone:", reservation.Driverphno));
								oVBox.addItem(createLabelValueHBox("Vehicle Type:", reservation.Vehicletype));
								oVBox.addItem(createLabelValueHBox("Reserved Date:", reservation.Intime));

								oDialog.open();
							});
						} else {
							sap.m.MessageToast.show("No reservation details found for the selected plot.");
						}
					}.bind(this),
					error: function (oError) {
						sap.m.MessageToast.show("Error fetching reservation details: " + oError.message);
						console.error(oError); // Debug: Log error details
					}
				});
			},



			onAssignPress: async function () {
				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "yyyy-MM-dd HH:mm:ss" // Define your desired pattern here
				});

				var currentDate = new Date(); // Current system date and time
				var formattedDateTime = oDateFormat.format(currentDate);
				debugger
				const oPayload = this.getView().byId("page1").getModel("localModel").getProperty("/");
				const { Vehicleno, Drivername, Driverphno } = this.getView().byId("page1").getModel("localModel").getProperty("/").VehicalDeatils;
				const Vehicletype = this.getView().byId("idselectvt").getSelectedKey();
				const oModel = this.getView().byId("pageContainer").getModel();
				const plotNo = this.getView().byId("idparkingLotSelect").getSelectedKey();
				oPayload.VehicalDeatils.Parkinglot = plotNo;
				oPayload.VehicalDeatils.Vehicletype = Vehicletype;


				oPayload.VehicalDeatils.Intime = formattedDateTime;

				if (!(Drivername && Driverphno && Vehicleno && Vehicletype && plotNo)) {
					MessageBox.error("Enter all details")
					return
				}
				var trimmedPhone = Driverphno.trim();

				// Validate phone number
				var phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
				if (!(phoneRegex.test(trimmedPhone))) {
					MessageBox.error("Please enter a valid phone number example PH NO: starts with 6,7,8,9 and must 10 digits");
					return;
				};
				var truckno = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
				if (!(truckno.test(Vehicleno))) {
					MessageBox.error("Please check Vehicle Number Once Example:XX00XX1234");
					return;
				};

				var ovehicleno = await this.vehicleexists(oModel, oPayload.VehicalDeatils.Vehicleno)
				if (ovehicleno) {
					MessageBox.error("Vehicle number alredy exists: check once your vehicel no");
				}

				try {
					// Assuming createData method sends a POST request
					await this.createData(oModel, oPayload.VehicalDeatils, "/VehicledataSet");

					var sPath = this.byId("idparkingLotSelect").getSelectedItem().getBindingContext().getPath();
					const updatedParkingLot = {
						Parkingno: plotNo,
						Status: "Occupied",
						Processtype: Vehicletype
					};
					oModel.update(sPath, updatedParkingLot, {
						success: function () {
						}.bind(this),
						error: function (oError) {
							sap.m.MessageBox.error("Failed to update: " + oError.message);
						}.bind(this)
					});

					//   start SMS
					const accountSid = "ACfcd333bcb3dc2c2febd267ce455a6762"
					const authToken = "687323f325394ff3b30f44a83444c2b2"

					// debugger
					const toNumber = `+91${Driverphno}`
					const fromNumber = '+13613109079';
					const messageBody = `Hi ${Drivername},\n\nYour vehicle with registration number ${Vehicleno} was previously parked in Slot number ${plotNo}.Please remove your vehicle from the parking lot at your earliest convenience..\n\nPlease ignore this message if you have already removed your vehicle from the parking lot.\n\nThank you,\nVishal Parking Management.`;


					// Twilio API endpoint for sending messages
					const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;


					// Send POST request to Twilio API using jQuery.ajax
					$.ajax({
						url: url,
						type: 'POST',
						async: true,
						headers: {
							'Authorization': 'Basic ' + btoa(accountSid + ':' + authToken)
						},
						data: {
							To: toNumber,
							From: fromNumber,
							Body: messageBody
						},
						success: function (data) {
							MessageToast.show('if number exists SMS will be sent!');
						},
						error: function (error) {
							MessageToast.show('Failed to send SMS: ' + error);
						}
					});

					// sms endR



					function makeAnnouncement(message, lang = 'en-US') {
						// Check if the browser supports the Web Speech API
						if ('speechSynthesis' in window) {
							// Create a new instance of SpeechSynthesisUtterance
							var utterance = new SpeechSynthesisUtterance(message);

							// Set properties (optional)
							utterance.pitch = 1;
							utterance.rate = 0.75;
							utterance.volume = 1;
							utterance.lang = lang;

							// Speak the utterance
							debugger
							window.speechSynthesis.speak(utterance);

						} else {
							console.log('Sorry, your browser does not support the Web Speech API.');
						}

					}

					// Example usage
					makeAnnouncement(`कृपया ध्यान दें। वाहन नंबर ${Vehicleno} को स्लॉट नंबर ${plotNo} द्वारा आवंटित किया गया है।`, 'hi-IN');
					//makeAnnouncement(`దయచేసి వినండి. వాహనం నంబర్ ${Vehicleno} కు స్లాట్ నంబర్ ${plotNo} కేటాయించబడింది.`, 'te-IN');

					sap.m.MessageToast.show(
						`Vehicel No ${Vehicleno} allocated to Slot No ${plotNo}`,
					);


				} catch (error) {
					console.error("Error:", error);
				}
				this.triggerPrintForm();
				this.onclearvalues();

			},

			vehicleexists: async function (oModel, sVehicleNo) {
				debugger
				return new Promise((resolve, reject) => {
					oModel.read("/VehicledataSet", {
						filters: [
							new Filter("Vehicleno", FilterOperator.EQ, sVehicleNo),
						],
						success: function (oData) {
							resolve(oData.results.length > 0)
						},
						error: function () {
							reject("An error occurred while checking vehicle existence.");
						}
					});
				});
			},

			onclearvalues: function () {
				var oLocalModel = this.getView().getModel("localModel");
				oLocalModel.setProperty("/VehicalDeatils", {
					Vehicleno: "",
					Drivername: "",
					Driverphno: "",
					Vehicletype: "",
					Outtime: "",
					Parkinglot: ""
				});

				// Clear any other necessary fields or models
				this.getView().byId("idparkingLotSelect").setValue("");
			},
			triggerPrintForm: function () {
				debugger
				// Fetch values from the view
				var currentDateTime = new Date();
				var formattedDate = currentDateTime.toLocaleDateString();
				var formattedTime = currentDateTime.toLocaleTimeString();
				var sSlotNumber = this.byId("idparkingLotSelect").getSelectedKey();
				var sVehicleNumber = this.byId("commentsTextArea").getValue();
				var sVehicleType = this.byId("idselectvt").getSelectedKey();
				var sDriverNumber = this.byId("driverPhoneInput").getValue();
				var sDriverName = this.byId("driverNameInput").getValue();


				// Create a new window for printing
				var printWindow = window.open('', '', 'height=600,width=800');

				// Write HTML content to the print window
				printWindow.document.write('<html><head><title>Print Receipt</title>');
				printWindow.document.write('<style>');
				printWindow.document.write('body { font-family: Arial, sans-serif; margin: 20px; }');
				printWindow.document.write('.details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }');
				printWindow.document.write('.details-table th, .details-table td { border: 1px solid #000; padding: 8px; text-align: left; }');
				printWindow.document.write('.details-table th { background-color: #f2f2f2; }');
				printWindow.document.write('.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }');
				printWindow.document.write('.date-time { flex-grow: 1; }');
				printWindow.document.write('.qr-code { margin-right: 50px; }');
				printWindow.document.write('.truck-image { text-align: center; margin-top: 20px; }');
				printWindow.document.write('.logo { position: absolute; top: 20px; right: 20px; }');
				printWindow.document.write('.Dummy { padding:1rem; }');
				printWindow.document.write('</style>');
				printWindow.document.write('</head><body>');

				// Add the logo to the top right corner
				printWindow.document.write('<div class="logo">');
				printWindow.document.write('<img src="https://artihcus.com/assets/img/AG-logo.png" height="50"/>'); // Reduced size
				printWindow.document.write('</div>');
				printWindow.document.write('<div class="Dummy">');
				printWindow.document.write('<div class="Dummy">');
				printWindow.document.write('</div>');

				printWindow.document.write('<div class="title">');
				printWindow.document.write('<h1>Parking Lot Allocation Slip:</h1>');
				printWindow.document.write('</div>');
				printWindow.document.write('<div class="header">');
				printWindow.document.write('<div class="date-time">');
				printWindow.document.write('<p><strong>Date:</strong> ' + formattedDate + '</p>');
				printWindow.document.write('<p><strong>Time:</strong> ' + formattedTime + '</p>');
				printWindow.document.write('</div>');
				printWindow.document.write('<div class="qr-code" id="qrcode"></div>');
				printWindow.document.write('</div>');
				printWindow.document.write('<table class="details-table">');
				printWindow.document.write('<tr><th>Property</th><th>Details</th></tr>');
				printWindow.document.write('<tr><td>Slot Number</td><td>' + sSlotNumber + '</td></tr>');
				printWindow.document.write('<tr><td>Vehicle Number</td><td>' + sVehicleNumber + '</td></tr>');
				printWindow.document.write('<tr><td>Vehicle Type</td><td>' + sVehicleType + '</td></tr>');
				printWindow.document.write('<tr><td>Driver Phone Number</td><td>' + sDriverNumber + '</td></tr>');
				printWindow.document.write('<tr><td>Driver Name</td><td>' + sDriverName + '</td></tr>');
				// printWindow.document.write('<tr><td>Delivery Type</td><td>' + sServiceType + '</td></tr>');
				printWindow.document.write('</table>');
				printWindow.document.write('<div class="truck-image">');
				printWindow.document.write('</div>');

				// Close document and initiate QR code generation
				printWindow.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');
				printWindow.document.write('<script>');
				printWindow.document.write('setTimeout(function() {');
				printWindow.document.write('new QRCode(document.getElementById("qrcode"), {');
				printWindow.document.write('text: "' + sVehicleNumber + '",'); // QR code contains vehicle number
				printWindow.document.write('width: 100,');
				printWindow.document.write('height: 100');
				printWindow.document.write('});');
				printWindow.document.write('}, 1000);'); // Adjust the timeout for QR code rendering
				printWindow.document.write('</script>');

				// Close document
				printWindow.document.write('</body></html>');
				printWindow.document.close();
				printWindow.focus();

				// Wait for QR code to be fully rendered before printing
				setTimeout(function () {
					printWindow.print();
				}, 1500); // Timeout to ensure the QR code is rendered before printing
			},
			//

			vehiclesubmit: function (oEvent) {
				debugger
				var that = this
				const oView = this.getView()
				var oLocalModel = this.getView().byId("page1").getModel("localModel");
				var sVehicleNo = oEvent.getParameter("value");
				var oModel = this.getView().byId("pageContainer").getModel();

				oModel.read("/VehicledataSet", {
					filters: [
						new Filter("Vehicleno", FilterOperator.EQ, sVehicleNo)
					],
					success: function (oData) {
						var aVehicles = oData.results;
						if (aVehicles.length > 0) {


							var oVehicle1 = aVehicles.filter(checkVehicle)
							function checkVehicle(v) {
								console.log(v)
								return v.Vehicleno === sVehicleNo;
							}
							console.log(oVehicle1)

							var oVehicle = oVehicle1[0];
							// Set other fields based on the found vehicle
							oLocalModel.setProperty("/VehicalDeatils/Vehicleno", oVehicle.Vehicleno);
							oLocalModel.setProperty("/VehicalDeatils/Drivername", oVehicle.Drivername);
							oLocalModel.setProperty("/VehicalDeatils/Driverphno", oVehicle.Driverphno);
							oLocalModel.setProperty("/VehicalDeatils/Vehicletype", oVehicle.Vehicletype);
							oLocalModel.setProperty("/VehicalDeatils/Intime", oVehicle.Intime);
							oLocalModel.setProperty("/VehicalDeatils/Parkinglot", oVehicle.Parkinglot);
							this.oView.byId("idselectvt").setValue(oVehicle.Vehicletype);
							this.oView.byId("idparkingLotSelect").setValue(oVehicle.Parkinglot);

						} else {
							// Handle case where vehicle number was not found
							sap.m.MessageToast.show("Vehicle number not found.");
							// Optionally clear other fields
							oLocalModel.setProperty("/VehicalDeatils/Vehicleno", "");
							oLocalModel.setProperty("/VehicalDeatils/Drivername", "");
							oLocalModel.setProperty("/VehicalDeatils/Driverphno", "");
							oLocalModel.setProperty("/VehicalDeatils/Vehicletype", "");
							oLocalModel.setProperty("/VehicalDeatils/Intime", "");
							// Clear other fields as needed
						}
					}.bind(this),
					error: function (oError) {
						sap.m.MessageToast.show("Error fetching vehicle details: " + oError.message);
					}

				});
			},

			//unasign function
			onUnassignPress1: async function () {
				debugger
				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "yyyy-MM-dd HH:mm:ss" // Define your desired pattern here
				});

				var currentDate = new Date(); // Current system date and time
				var formattedDateTime = oDateFormat.format(currentDate);

				const that = this; // Store reference to 'this' for later use inside nested functions
				const oPayload = this.getView().byId("page1").getModel("localModel").getProperty("/");
				const { Drivername, Driverphno, Vehicleno, Vehicletype, Intime } = this.getView().byId("page1").getModel("localModel").getProperty("/").VehicalDeatils;
				const oModel = this.getView().byId("pageContainer").getModel(); // Assuming "ModelV2" is your ODataModel
				const plotNo = this.getView().byId("idparkingLotSelect").getValue();
				oPayload.VehicalDeatils.Parkinglot = plotNo;


				oPayload.VehicalDeatils.Outtime = formattedDateTime;

				var oHistoryId = await this.generateUUID()

				try {
					const oHistory = {
						Historyid: oHistoryId,
						Vehicleno: Vehicleno,
						Drivername: Drivername,
						Driverphno: Driverphno,
						Vehicletype: Vehicletype,
						Intime: Intime,
						Outtime: formattedDateTime,
						Parkinglot: plotNo
					}

					await that.createData(oModel, oHistory, "/HistorydataSet");

					await that.deleteData(oModel, "/VehicledataSet", Vehicleno);

					const updatedParkingLot = {
						Parkingno: plotNo,
						Status: "AVAILABLE"

					};
					oModel.update("/ZEWM_PARKINGLOT_SERVICESet('" + plotNo + "')", updatedParkingLot, {
						success: function () {
							sap.m.MessageToast.show(`Vehicle ${Vehicleno} unassigned and parking lot ${plotNo} is now available`);
						},
						error: function (oError) {
							sap.m.MessageBox.error("Failed to update : " + oError.message);
						}
					});

					//   start SMS
					const accountSid = "ACfcd333bcb3dc2c2febd267ce455a6762"
					const authToken = "687323f325394ff3b30f44a83444c2b2"

					// debugger
					const toNumber = `+91${Driverphno}`
					const fromNumber = '+13613109079';
					const messageBody = `Hi ${Drivername},\n\nYour vehicle with registration number ${Vehicleno} was previously parked in Slot number ${plotNo}.Please remove your vehicle from the parking lot at your earliest convenience..\n\nPlease ignore this message if you have already removed your vehicle from the parking lot.\n\nThank you,\nVishal Parking Management.`;


					// Twilio API endpoint for sending messages
					const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;


					// Send POST request to Twilio API using jQuery.ajax
					$.ajax({
						url: url,
						type: 'POST',
						async: true,
						headers: {
							'Authorization': 'Basic ' + btoa(accountSid + ':' + authToken)
						},
						data: {
							To: toNumber,
							From: fromNumber,
							Body: messageBody
						},
						success: function (data) {
							MessageToast.show('if number exists SMS will be sent!');
						},
						error: function (error) {
							MessageToast.show('Failed to send SMS: ' + error);
						}
					});

					// sms endR
					this.onclearvalues();
				} catch (error) {
					sap.m.MessageBox.error("Some technical Issue");
				}
			},

			onpressaddparkinglot: function () {
				var oView = this.getView();
				var oDialog = oView.byId("addParkingLotDialog");

				if (!oDialog) {
					oDialog = Fragment.load({
						id: oView.getId(),
						name: "com.app.parkinglotsrv.fragment.AddParkingLot",
						controller: this
					}).then(function (oDialog) {
						oView.addDependent(oDialog);
						oDialog.open();
					});
				} else {
					oDialog.open();
				}
			},

			onSavePress: async function () {
				var oView = this.getView();
				var oDialog = oView.byId("addParkingLotDialog");

				const oModel = this.getView().byId("pageContainer").getModel();

				var sParkingLotNo = oView.byId("parkingLotNoInput").getValue();
				var sProcessType = oView.byId("processTypeInput").getValue();

				try {
					// Ensure the model is up-to-date
					oModel.refresh(true);


					if (sParkingLotNo && sProcessType) {
						var oEntry = {
							Parkingno: sParkingLotNo,
							Processtype: sProcessType,
							Status: "AVAILABLE" // Initial status
						};

						// Call the OData service to create a new entry
						oModel.create("/ZEWM_PARKINGLOT_SERVICESet", oEntry, {
							success: function () {
								sap.m.MessageToast.show("Parking lot added successfully!");
								oDialog.close();
								// Refresh the table data
								var oTable = oView.byId("EmptySlotsTable");
								oTable.getBinding("items").refresh(true);
							},
							error: function () {
								sap.m.MessageToast.show("Error occurred while adding parking lot.");
							}
						});
					} else {
						sap.m.MessageToast.show("Please fill in all the fields.");
					}
				} catch (error) {
					sap.m.MessageToast.show(error);
				}
			},

			onEdit: function () {
				var oTable = this.byId("AssignedSlotsTable");
				var oSelectedItem = oTable.getSelectedItem();

				if (!oSelectedItem) {
					sap.m.MessageToast.show("Please select a slot to edit.");
					return;
				}
				var aCells = oSelectedItem.getCells();
				var oContext = oSelectedItem.getBindingContext();
				var oData = oContext.getObject();
				var sServiceType = oData.Vehicletype; // Get the service type of the selected item

				// Filter the ComboBox items based on the service type
				var oVBox = aCells[4];
				var oComboBox = oVBox.getItems()[1];
				this._filterAvailableSlotsByServiceType(oComboBox, sServiceType);

				// Make the ComboBox visible for editing
				aCells.forEach(function (oCell) {
					var aItems = oCell.getItems ? oCell.getItems() : [];
					aItems.forEach(function (oItem) {
						if (oItem instanceof sap.m.Text) {
							oItem.setVisible(false); // Hide text items
						} else if (oItem instanceof sap.m.Input || oItem instanceof sap.m.ComboBox) {
							oItem.setVisible(true); // Show input or combo box
						}
					});
				});

				this.byId("editButton").setVisible(false);
				this.byId("saveButton").setVisible(true);
				this.byId("cancelButton").setVisible(true);
			},
			_filterAvailableSlotsByServiceType: function (oComboBox, sServiceType) {
				var oModel = this.getView().getModel();
				var aFilters = [
					new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "AVAILABLE"),
					new sap.ui.model.Filter("Processtype", sap.ui.model.FilterOperator.EQ, sServiceType)
				];

				oComboBox.bindAggregation("items", {
					path: "/ZEWM_PARKINGLOT_SERVICESet",
					template: new sap.ui.core.Item({
						key: "{Parkingno}",
						text: "{Parkingno}"
					}),
					filters: aFilters
				});
			},
			onCancel: function () {
				var oTable = this.byId("AssignedSlotsTable");
				var aSelectedItems = oTable.getSelectedItems();

				aSelectedItems.forEach(function (oItem) {
					var aCells = oItem.getCells();
					aCells.forEach(function (oCell) {
						var aVBoxItems = aCells
						aVBoxItems[4].getItems()[0].setVisible(true); // Hide Text
						aVBoxItems[4].getItems()[1].setVisible(false); // Show Input
					});
				});

				this.byId("editButton").setVisible(true);
				this.byId("saveButton").setVisible(false);
				this.byId("cancelButton").setVisible(false);
			},

			onSave: function () {
				debugger
				const oView = this.getView();
				const oTable = this.byId("AssignedSlotsTable");
				// const aSelectedItems = oTable.getSelectedItems();
				const oSelected = oTable.getSelectedItem();

				if (oSelected) {
					const oContext = oSelected.getBindingContext().getObject();
					const sVehicle = oContext.Vehicleno;
					const sTypeofDelivery = oContext.Vehicletype;
					const sDriverMobile = oContext.Driverphno;
					const sDriverName = oContext.Drivername;
					var sOldSlotNumber = oContext.Parkinglot;


					const oSelect = oSelected.getCells()[4].getItems()[1];
					const sSlotNumber = oSelect.getSelectedKey(); // Get selected slot number

					var oDateFormat = DateFormat.getDateTimeInstance({
						pattern: "yyyy-MM-dd HH:mm:ss" // Define your desired pattern here
					});

					var currentDate = new Date(); // Current system date and time
					var formattedDateTime = oDateFormat.format(currentDate);

					// oPayload.VDETAILS.Outtime = formattedDateTime;

					// Create a record in history 
					const oNewUpdate = {
						Vehicleno: sVehicle,
						Intime: formattedDateTime,
						Vehicletype: sTypeofDelivery,
						Drivername: sDriverName,
						Driverphno: sDriverMobile,
						Parkinglot: sSlotNumber
					};

					// Update VDetails record
					const oDataModel = this.getOwnerComponent().getModel();
					oDataModel.update("/VehicledataSet('" + sVehicle + "')", oNewUpdate, {
						success: function () {

							const updatedParkingLot = {
								Parkinglot: sOldSlotNumber,
								Status: "AVAILABLE",

							};
							oDataModel.update("/ZEWM_PARKINGLOT_SERVICESet('" + sOldSlotNumber + "')", { Status: "AVAILABLE" }, {
								success: function () {

									const updatedNewParkingLot = {
										Parkinglot: sSlotNumber,
										Status: "Occupied",

									};
									oDataModel.update("/ZEWM_PARKINGLOT_SERVICESet('" + sSlotNumber + "')", { Status: "Occupied" }, {
										success: function () {
											// Refresh table binding or do other necessary actions
											oTable.getBinding("items").refresh();
											sap.m.MessageBox.success("Slot updated successfully");
										},
										error: function (oError) {
											sap.m.MessageBox.error("Failed to update new slot: " + oError.message);
										}
									});
								},
								error: function (oError) {
									sap.m.MessageBox.error("Failed to update old slot: " + oError.message);
								}
							});
						},
						error: function (oError) {
							sap.m.MessageBox.error("Failed to update VDetails: " + oError.message);
						}
					});
				}

				// Additional UI updates or actions after saving
				oSelected.forEach(function (oItem) {
					var aCells = oItem.getCells();
					aCells.forEach(function (oCell) {
						var aVBoxItems = oCell.getItems();
						aVBoxItems[0].setVisible(true); // Hide Text
						aVBoxItems[1].setVisible(false); // Show Input
					});
				});
				this.byId("editButton").setVisible(true);
				this.byId("saveButton").setVisible(false);
				this.byId("cancelButton").setVisible(false);
			},

			generateUUID: function () {
				debugger
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
					return v.toString(16);
				});
			},

			_setHistoryModel: function () {
				debugger


				var oModel = this.getOwnerComponent().getModel();
				var that = this;

				oModel.read("/HistorydataSet", {
					success: function (oData) {
						console.log("Fetched Data:", oData);
						var aItems = oData.results;

						var oProcessedData = that._processHistoryData(aItems);

						var oHistoryModel = new JSONModel();
						oHistoryModel.setData(oProcessedData);
						that.getView().setModel(oHistoryModel, "HistoryModel");
					},
					error: function (oError) {
						console.error(oError);
					}
				});
			},

			_processHistoryData: function (aItems) {

				var oData = {};

				aItems.forEach(function (item) {
					var date = new Date(item.Outtime).toISOString().split("T")[0]; // Convert date to ISO string and extract date part

					if (!oData[date]) {
						oData[date] = {
							date: date,
							inwardCount: 0,
							outwardCount: 0,
							totalVehicle: 0
						};
					}

					if (item.Vehicletype === "INWARD") {
						oData[date].inwardCount += 1;
					} else if (item.Vehicletype === "OUTWARD") {
						oData[date].outwardCount += 1;
					}
					oData[date].totalVehicle = oData[date].inwardCount + oData[date].outwardCount;
				});

				return {
					Items: Object.values(oData)
				};
			},

			onSelectData: function (oEvent) {
				var aData = oEvent.getParameter("data");
				if (aData && aData.length > 0) {
					var oSelectedData = aData[0].data;
					sap.m.MessageToast.show(
						"Selected Date: " + oSelectedData.date +
						"\nInward Count: " + oSelectedData.inwardCount +
						"\nOutward Count: " + oSelectedData.outwardCount
					);
				} else {
					console.error("No data selected or data structure mismatch.");
				}
			},



			handleRenderComplete: function (oEvent) {
				console.log("Chart rendering complete.");
			},

			onPressrefresh: function () {
				this.getView().getModel().refresh(true)
			},

			onpressassignrd: async function () {
				debugger
				var oSelected = this.byId("ReservationTable").getSelectedItems();
				if (oSelected.length === 0) {
					MessageBox.error("Please Select atleast row to Assign");
					return
				};

				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "yyyy-MM-dd HH:mm:ss" // Define your desired pattern here
				});

				var currentDate = new Date(); // Current system date and time
				var formattedDateTime = oDateFormat.format(currentDate);

				var oSelectedRow = this.byId("ReservationTable").getSelectedItem().getBindingContext().getObject();
				var orow = this.byId("ReservationTable").getSelectedItem().getBindingContext().getPath();

				var resmodel = new JSONModel({
					Vehicleno: oSelectedRow.Vehicleno,
					Drivername: oSelectedRow.Drivername,
					Driverphno: oSelectedRow.Driverphno,
					Vehicletype: oSelectedRow.Vehicletype,
					Intime: formattedDateTime,
					Parkinglot: oSelectedRow.Parkinglot,

				});
				var temp = oSelectedRow.Parkinglot;

				const oModel = this.getView().byId("pageContainer").getModel();
				debugger
				this.getView().byId("page8").setModel(resmodel, "resmodel");
				this.getView().byId("page8").getModel("resmodel").getProperty("/");
				oModel.create("/VehicledataSet", resmodel.getData(), {
					success: function (odata) {
						debugger
						oModel.remove(orow, {
							success: function () {
								oModel.refresh()
								oModel.update("/ZEWM_PARKINGLOT_SERVICESet('" + temp + "')", { Status: "Occupied" }, {
									success: function () {
										sap.m.MessageBox.success(`Reserved Vehicle ${oSelectedRow.Vehicleno} assigned successfully to plot ${oSelectedRow.Parkinglot}.`);
										oModel.refresh();
									}, error: function () {
										sap.m.MessageBox.error("HBJKLJHGVhb");
									}

								})
							},
							error: function (oError) {
								sap.m.MessageBox.error("Failed to update : " + oError.message);
							}

						})
						//   start SMS
						const accountSid = 'ACfcd333bcb3dc2c2febd267ce455a6762';
						const authToken = 'ea44ceea6205dd2864f4b5beb40d31c0';

						// debugger
						const toNumber = `+91${oSelectedRow.phone}`
						const fromNumber = '+13613109079';
						const messageBody = `Hi ${oSelectedRow.driverName},\n\nYour vehicle with registration number ${oSelectedRow.vehicalNo} was previously parked in Slot number ${oSelectedRow.plotNo_plot_NO}.Please remove your vehicle from the parking lot at your earliest convenience..\n\nPlease ignore this message if you have already removed your vehicle from the parking lot.\n\nThank you,\nVishal Parking Management.`;


						// Twilio API endpoint for sending messages
						const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;


						// Send POST request to Twilio API using jQuery.ajax
						$.ajax({
							url: url,
							type: 'POST',
							async: true,
							headers: {
								'Authorization': 'Basic ' + btoa(accountSid + ':' + authToken)
							},
							data: {
								To: toNumber,
								From: fromNumber,
								Body: messageBody
							},
							success: function (data) {
								MessageToast.show('if number exists SMS will be sent!');
							},
							error: function (error) {
								MessageToast.show('Failed to send SMS: ' + error);
							}
						});

						// sms end

					},
					error: function (oError) {
						sap.m.MessageBox.error("Failed to update : " + oError.message);
					}
				})
			},

			OnpressNotify: async function (oEvent) {
				var oButton = oEvent.getSource(),
					oView = this.getView();
				if (!this._pPopover) {
					this._pPopover = this.loadFragment("notification").then(function (oPopover) {
						oView.addDependent(oPopover);
						oPopover.setModel(oModel); // Bind model to the fragment
						return oPopover;
					});
				}
				this._pPopover.then(function (oPopover) {
					oPopover.openBy(oButton);
				});
				var oModel = this.getOwnerComponent().getModel();
				this.getView().byId("idnotificationDialog").setModel(oModel)
			},

			onModel: async function () {
				var oModel = this.getOwnerComponent().getModel();
				var that = this;
				await oModel.read("/vendordataSet", {
					success: function (oData) {
						var t = oData.results.length;
						that.byId("idnotification7").setValue(t);
					},
					error: function () {
					}
				})

				oModel.refresh()
			},
			onBeforeRendering: function () {
				this.onModel();

			},
			onAfterRendering: function () {
				this.onModel();
			},

			onPressAccept: async function () {
				var oSelected = this.byId("vendorRequestTable").getSelectedItem();
				if (oSelected) {
					var oSelectedObject = oSelected.getBindingContext().getObject();
					var oServiceType = oSelectedObject.Vehicletype;

					// Create and set a JSON model to store the selected item details
					const oConfirmRequestModel = new sap.ui.model.json.JSONModel({
						Vendorname: oSelectedObject.Vendorname,
						Driverphno: oSelectedObject.Driverphno,
						Drivername: oSelectedObject.Drivername,
						Vehicletype: oSelectedObject.Vehicletype,
						Vehicleno: oSelectedObject.Vehicleno,
						Intime: oSelectedObject.Intime
					});
					this.getView().setModel(oConfirmRequestModel, "oConfirmRequestModel");

					// Load the dialog fragment if not already loaded
					if (!this.oDialog) {
						this.oDialog = await Fragment.load({
							id: this.getView().getId(),
							name: "com.app.parkinglotsrv.fragment.reservationrequest",
							controller: this
						});
						this.getView().addDependent(this.oDialog);
					}

					var oModel = this.getOwnerComponent().getModel();
					var oThis = this;
					// Fetch all slots data
					oModel.read("/ZEWM_PARKINGLOT_SERVICESet", {
						success: function (oData) {
							// Filter available slots based on Service Type
							var aFilteredSlots = oData.results.filter(function (slot) {
								return slot.Status === "AVAILABLE" && slot.Processtype === oServiceType;
							});

							// Get the ComboBox control
							var oComboBox = oThis.byId("idselectSlotReserve");
							// Clear existing items from ComboBox
							oComboBox.removeAllItems();
							// Add filtered slots to the ComboBox
							aFilteredSlots.forEach(function (slot) {
								oComboBox.addItem(new sap.ui.core.ListItem({
									key: slot.Parkingno,
									text: slot.Parkingno
								}));
							});
							// Open the dialog
							oThis.oDialog.open();
						},
						error: function (oError) {
							sap.m.MessageBox.error("Failed to load slot data.");
						}
					});
				} else {
					// Show a message if no vendor is selected
					sap.m.MessageToast.show("Please Select a Vendor to Confirm A Slot Reservation..!");
				}
			},
			onCloseDialog: function () {
				if (this.oDialog.isOpen()) {
					this.oDialog.close();
				}
			},


			onReserveSlotBtnPress: async function () {

				debugger;

				const svendorName = this.getView().byId("InputVedorname12").getValue();
				const svehicleNo = this.getView().byId("InputVehicleno12").getValue();
				const sdriverName = this.getView().byId("InputDriverName12").getValue();
				const sphoneNumber = this.getView().byId("InputPhonenumber12").getValue();
				const svehicleType = this.getView().byId("InputVehicletype12").getValue();
				const sReservedDate = this.getView().byId("InputEstimatedtime12").getValue();

				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "yyyy-MM-dd HH:mm:ss" // Define your desired pattern here
				});

				var currentDate = new Date(); // Current system date and time
				var formattedDateTime = oDateFormat.format(currentDate);

				const oReserveModel = new JSONModel({

					Reservations: {
						Vendorname: svendorName,
						Vehicleno: svehicleNo,
						Drivername: sdriverName,
						Driverphno: sphoneNumber,
						Vehicletype: svehicleType,
						Intime: formattedDateTime,
						Parkinglot: "",
					}
				});
				this.getView().setModel(oReserveModel, "reserveModel");
				const oPayload = this.getView().byId("page8").getModel("reserveModel").getProperty("/");
				const oModel = this.getView().byId("pageContainer").getModel();
				const plotNo = this.getView().byId("idselectSlotReserve").getValue();
				oPayload.Reservations.Parkinglot = plotNo;

				// var oSelectedRow = this.byId("idRequest").getSelectedItem().getBindingContext().getObject();
				var orow = this.byId("vendorRequestTable").getSelectedItem().getBindingContext().getPath();


				try {
					// Assuming createData method sends a POST request
					await this.createData(oModel, oPayload.Reservations, "/ReservationdataSet");

					const updatedParkingLot = {
						Parkingno: plotNo,
						Status: "Reserved",
						Processtype: svehicleType
						// Add other properties if needed
					};

					//Update parking lot entity
					oModel.update("/ZEWM_PARKINGLOT_SERVICESet('" + plotNo + "')", updatedParkingLot, {
						success: function () {

							oModel.remove(orow, {
								success: function () {
									oModel.refresh()
									sap.m.MessageToast.show(`${svehicleNo} Reserved to Slot No ${plotNo}`);
								},
								error: function () {

								}

							})
						},
						error: function (oError) {
							sap.m.MessageBox.error("Failed to update: " + oError.message);
						}
					});

					// Clear fields or perform any necessary actions
					this.oDialog.close();
				} catch (error) {
					console.error("Error:", error);
				}
				this.onclearPress12();
				this.oDialog.close();

			},
			onSearchHistory: async function (oEvent) {
				var sQuery = oEvent.getParameter("newValue").trim();
				var oList = this.byId("AssignedhistoryTable");

				//First getting data from OData...
				try {
					var oModel = this.getOwnerComponent().getModel();
					//var sPath = "/HistorydataSet"; 

					// Fetch the data from the OData service
					var aAllData = await new Promise((resolve, reject) => {
						oModel.read("/HistorydataSet", {
							success: function (oData) {
								resolve(oData.results);
							},
							error: function (oError) {
								console.error("Failed to fetch all data:", oError);
								reject(oError);
							}
						});
					});

					// If there's a search query, filter the data based on the query
					var aFilteredData;
					if (sQuery) {
						aFilteredData = aAllData.filter(function (oItem) {
							return (oItem.Parkinglot && oItem.Parkinglot.includes(sQuery)) ||
								(oItem.Vehicletype && oItem.Vehicletype.includes(sQuery)) ||
								(oItem.Vehicleno && oItem.Vehicleno.includes(sQuery)) ||
								(oItem.Driverphno && oItem.Driverphno.includes(sQuery)) ||
								(oItem.Drivername && oItem.Drivername.includes(sQuery)) ||
								(oItem.Intime && oItem.Intime.includes(sQuery)) ||
								(oItem.Outtime && oItem.Outtime.includes(sQuery));
						});
					} else {
						aFilteredData = aAllData;
					}

					// Create a new JSON model with the filtered data
					var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

					// Bind the filtered model to the table
					oList.setModel(oFilteredModel);
					oList.bindItems({
						path: "/",
						template: oList.getBindingInfo("items").template
					});

				} catch (error) {
					console.error("Error fetching or filtering data:", error);
				}
			},

			onSearchResevationtable: async function (oEvent) {
				var sQuery = oEvent.getParameter("newValue").trim();
				var oTable = this.byId("ReservationTable");

				try {
					var oModel = this.getOwnerComponent().getModel();

					// Fetch the data from the OData service
					var aAllData = await new Promise((resolve, reject) => {
						oModel.read("/ReservationdataSet", {
							success: function (oData) {
								resolve(oData.results);
							},
							error: function (oError) {
								console.error("Failed to fetch all data:", oError);
								reject(oError);
							}
						});
					});

					// Filter data based on search query
					var aFilteredData;
					if (sQuery) {
						aFilteredData = aAllData.filter(function (oItem) {
							return (oItem.Vehicleno && oItem.Vehicleno.includes(sQuery)) ||
								(oItem.Drivername && oItem.Drivername.includes(sQuery)) ||
								(oItem.Driverphno && oItem.Driverphno.includes(sQuery)) ||
								(oItem.Vehicletype && oItem.Vehicletype.includes(sQuery)) ||
								(oItem.Intime && oItem.Intime.includes(sQuery)) ||
								(oItem.Parkinglot && oItem.Parkinglot.includes(sQuery));
						});
					} else {
						aFilteredData = aAllData; // No search query, use all data
					}

					// Create a new JSON model with the filtered data
					var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

					// Bind the filtered model to the table
					oTable.setModel(oFilteredModel);
					oTable.bindItems({
						path: "/",
						template: oTable.getBindingInfo("items").template
					});

				} catch (error) {
					console.error("Error fetching or filtering data:", error);
				}
			},
			onSearchparkinglots: async function (oEvent) {
				var sQuery = oEvent.getParameter("newValue").trim();
				var oTable = this.byId("EmptySlotsTable"); // ID of the table

				try {
					var oModel = this.getOwnerComponent().getModel();

					// Fetch the data from the OData service
					var aAllData = await new Promise((resolve, reject) => {
						oModel.read("/ZEWM_PARKINGLOT_SERVICESet", {
							success: function (oData) {
								resolve(oData.results);
							},
							error: function (oError) {
								console.error("Failed to fetch all data:", oError);
								reject(oError);
							}
						});
					});

					// Filter data based on search query
					var aFilteredData;
					if (sQuery) {
						aFilteredData = aAllData.filter(function (oItem) {
							return (oItem.Parkingno && oItem.Parkingno.includes(sQuery)) ||
								(oItem.Processtype && oItem.Processtype.includes(sQuery)) ||
								(oItem.Status && oItem.Status.includes(sQuery));
						});
					} else {
						aFilteredData = aAllData; // No search query, use all data
					}

					// Create a new JSON model with the filtered data
					var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

					// Bind the filtered model to the table
					oTable.setModel(oFilteredModel);
					oTable.bindItems({
						path: "/",
						template: oTable.getBindingInfo("items").template
					});

				} catch (error) {
					console.error("Error fetching or filtering data:", error);
				}
			},
			onSearchassignedslots: async function (oEvent) {
				var sQuery = oEvent.getParameter("newValue").trim();
				var oTable = this.byId("AssignedSlotsTable");

				try {
					var oModel = this.getOwnerComponent().getModel();

					// Fetch the data from the OData service
					var aAllData = await new Promise((resolve, reject) => {
						oModel.read("/VehicledataSet", {
							success: function (oData) {
								resolve(oData.results);
							},
							error: function (oError) {
								console.error("Failed to fetch all data:", oError);
								reject(oError);
							}
						});
					});

					// Filter data based on search query
					var aFilteredData;
					if (sQuery) {
						aFilteredData = aAllData.filter(function (oItem) {
							return (oItem.Vehicleno && oItem.Vehicleno.includes(sQuery)) ||
								(oItem.Drivername && oItem.Drivername.includes(sQuery)) ||
								(oItem.Driverphno && oItem.Driverphno.includes(sQuery)) ||
								(oItem.Vehicletype && oItem.Vehicletype.includes(sQuery)) ||
								(oItem.Parkinglot && oItem.Parkinglot.includes(sQuery)) ||
								(oItem.Intime && oItem.Intime.includes(sQuery));
						});
					} else {
						aFilteredData = aAllData; // No search query, use all data
					}

					// Create a new JSON model with the filtered data
					var oFilteredModel = new JSONModel(aFilteredData);

					// Bind the filtered model to the table
					oTable.setModel(oFilteredModel);
					oTable.bindItems({
						path: "/",
						template: oTable.getBindingInfo("items").template
					});

				} catch (error) {
					console.error("Error fetching or filtering data:", error);
				}
			},
			onPressReject: function () {
				debugger
				const oThis = this
				var oModel = this.getOwnerComponent().getModel();
				const oSelected = this.getView().byId("vendorRequestTable").getSelectedItem(),
					//sUUId = oSelected.getBindingContext().getObject().Uuid,
					sDriverName = oSelected.getBindingContext().getObject().Drivername,
					sDriverMobile = oSelected.getBindingContext().getObject().Vendorphno,
					svehicleNo = oSelected.getBindingContext().getObject().Vehicleno;

				oModel.remove(`/vendordataSet('${svehicleNo}')`, {
					success: function () {

						MessageBox.information("Request rejected sucessfully")

						//   start SMS
						const accountSid = "ACfcd333bcb3dc2c2febd267ce455a6762"
						const authToken = "687323f325394ff3b30f44a83444c2b2"

						// debugger
						const toNumber = `+91${sDriverMobile}`
						const fromNumber = '+13613109079';
						const messageBody = `Hi ${sDriverName},\n\nYour vehicle with registration number ${svehicleNo} is rejected `;


						// Twilio API endpoint for sending messages
						const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;


						// Send POST request to Twilio API using jQuery.ajax
						$.ajax({
							url: url,
							type: 'POST',
							async: true,
							headers: {
								'Authorization': 'Basic ' + btoa(accountSid + ':' + authToken)
							},
							data: {
								To: toNumber,
								From: fromNumber,
								Body: messageBody
							},
							success: function (data) {
								MessageToast.show('if number exists SMS will be sent!');
							},
							error: function (error) {
								MessageToast.show('Failed to send SMS: ' + error);
							}
						});

						// sms endR
					},
					error: function (oError) {
						sap.m.MessageBox.error("Failed to reject the request: " + oError.message);
					}
				})
			},

		});
	});

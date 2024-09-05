/*global QUnit*/

sap.ui.define([
	"comapp/parkinglotsrv/controller/home1.controller"
], function (Controller) {
	"use strict";

	QUnit.module("home1 Controller");

	QUnit.test("I should test the home1 controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});

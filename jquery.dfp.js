//DFP Adder
(function($,window) {

	"use strict";

	// Save Scope
	var dfpScript = this;

	// DFP account ID
	var dfpID = '';

	// Count of ads
	var count = 0;

	// Count of rendered ads
	var rendered = 0;

	// Default DFP jQuery selector
	var dfpSelector = '.adunit';

	// Init function sets required params and loads googles dfp script
	var init = function(id,selector,options) {

		dfpID = id || dfpID;
		dfpSelector = selector || dfpSelector;
		options = options || {};
		dfpLoader();
		$(function(){createAds(options);});

	};

	// Main function to find and create all ads
	var createAds = function(options) {

		// Array to Store AdUnits
		var adUnitArray = [];

		// Default DFP options
		var targetPaths = getTargetpaths();
		var dfpOptions = {
			'setTargeting':{
				'inURL':targetPaths,
				'URLIs':targetPaths[0],
				'Domain':window.location.host
			},
			'enableSingleRequest':true,
			'collapseEmptyDivs':'original'
		};

		// Make sure the default setTargetting is not lost in the object merge
		if(typeof options.setTargeting !== 'undefined' && typeof dfpOptions.setTargeting !== 'undefined') {
			options.setTargeting = $.extend(options.setTargeting, dfpOptions.setTargeting);
		}

		// Merge options objects
		dfpOptions = $.extend(dfpOptions, options);

		// Loops through on page Ad units and gets ads for them.
		$(dfpSelector).each(function() {

			var adUnit = this;

			count++;

			// adUnit name
			var adUnitName = getName(adUnit);

			// adUnit id - this will use an existing id or an auto generated one.
			var adUnitID = getID(adUnit,adUnitName,count);

			// get dimensions of the adUnit
			var dimensions = getDimensions(adUnit);

			// get existing content
			var $existingContent = $(adUnit).html();

			// wipe html clean ready for ad
			$(adUnit).html('');

			// Store AdUnits
			adUnitArray.push(adUnitID);

			// Push commands to DFP to create ads
			window.googletag.cmd.push(function() {

				// Create the ad
				var googleAdUnit = window.googletag.defineSlot('/'+dfpID+'/'+adUnitName, [dimensions.width, dimensions.height], adUnitID).addService(window.googletag.pubads());

				// The following hijacks an internal google method to check if the div has been
				// collapsed after the ad has been attempted to be loaded.
				googleAdUnit.oldRenderEnded = googleAdUnit.renderEnded;
				googleAdUnit.renderEnded = function() {

					rendered++;

					var display = $(adUnit).css('display');

					// if the div has been collapsed but there was existing content expand the
					// div and reinsert the existing content.
					if(display === 'none' && $existingContent.trim().length > 0 && dfpOptions.collapseEmptyDivs === 'original') {
						$(adUnit).show().html($existingContent);
						display = 'block display-original';
					}

					$(adUnit).addClass('display-'+display);

					googleAdUnit.oldRenderEnded();

					// Excute afterEachAdLoaded
					if(typeof dfpOptions.afterEachAdLoaded === 'function') {
						dfpOptions.afterEachAdLoaded.call(this,adUnit);
					}

					// Excute afterAllAdsLoaded
					if(typeof dfpOptions.afterAllAdsLoaded === 'function' && rendered === count) {
						dfpOptions.afterAllAdsLoaded.call(this,adUnit);
					}

				};

			});

		});

		// Push DFP config options
		window.googletag.cmd.push(function() {

			if(dfpOptions.enableSingleRequest === true) {
				window.googletag.pubads().enableSingleRequest();
			}
			$.each(dfpOptions.setTargeting, function(k,v) {
				window.googletag.pubads().setTargeting(k,v);
			});
			if(dfpOptions.collapseEmptyDivs === true || dfpOptions.collapseEmptyDivs === 'original') {
				window.googletag.pubads().collapseEmptyDivs();
			}
			window.googletag.enableServices();

		});

		// Display each ad
		$.each(adUnitArray, function(k,v) {

			window.googletag.cmd.push(function(){window.googletag.display(v);});

		});

	};

	// Create an array of paths so that we can target DFP ads to Page URI's
	var getTargetpaths = function() {

		var paths = window.location.pathname.replace(/\/$/,'');
		var patt = new RegExp('\/([^\/]*)','ig');
		var pathsMatches = paths.match(patt);
		var targetPaths = ['/'];
		if(paths !== '/' && pathsMatches !== null) {
			var target = '';
			if(pathsMatches.length > 0) {
				$.each(pathsMatches,function(k,v){
					target += v;
					targetPaths.push(target);
				});
			}
		}

		return targetPaths.reverse();

	};

	// Get the id of the adUnit div or generate a unique one.
	var getID = function (adUnit,adUnitName,count) {

		var id = adUnit.id;
		if(id === '')
		{
			id = adUnit.id = adUnitName + '-auto-gen-id-' + count;
		}

		return id;

	};

	// Get the name of the Ad unit, either use the div id or
	// check for the optional attribute data-adUnit
	var getName = function(adUnit) {

		var name = adUnit.id;
		if(typeof $(adUnit).attr('data-adunit') !== 'undefined') {

			name = $(adUnit).attr('data-adunit');

		}

		return name;

	};

	// Get the dimensions of the ad unit using the cotainer div dimensions or
	// check for the optional attribute data-dimensions
	var getDimensions = function(adUnit) {

		var width = $(adUnit).width();
		var height = $(adUnit).height();

		// check if dimensions are hardcoded and overide the size
		if(typeof $(adUnit).attr('data-dimensions') !== 'undefined') {

			var dimensions = $(adUnit).attr('data-dimensions').split('x');
			width = parseInt(dimensions[0],10);
			height = parseInt(dimensions[1],10);

		}

		return {width: width, height: height};

	};

	// Call the google DFP script - there is a little bit of error detection in here to detect
	// if the dfp script has failed to load either through an error or it being blocked by an ad
	// blocker... if does not load we execute a dummy script to replace the real DFP.
	var dfpLoader = function() {

		window.googletag=window.googletag||{};
		window.googletag.cmd=window.googletag.cmd||[];

		var a=$(["<script><","/script>"].join(""));
		a.attr("type","text/javascript");
		a.attr("async","async");
		a.attr("src",document.location.protocol+"//www.googletagservices.com/tag/js/gpt.js");
		$("head").eq(0).prepend(a);

		// Adblock plus seems to hide blocked scripts... so we check for that
		//if(gads.style.display === 'none') {
		//	dfpBlocked();
		//}

	};

	// This function gets called if DFP has been blocked by an adblocker
	// it basically implements a basic dummy of the dfp object and allows the script to excute its callbacks
	// regardless of wheather DFP is actually in effect or not... its basically only useful for situations
	// where you are laying DFP over existing content and need to init things like slide shows after the loading
	// is completed.
	var dfpBlocked = function() {

		// Get the stored dfp commands
		var commands = window.googletag.cmd;

		// SetTimeout is a bit dirty but the script does not execute in the correct order without it
		setTimeout(function(){

			// overwrite the dfp object - replacing the command array with a function and defining missing functions
			window.googletag = {
				'cmd': {
					'push': function(callback){
						callback.call(dfpScript);
					}
				},
				'ads':[],
				'pubads':function() {return this;},
				'enableSingleRequest':function() {return this;},
				'setTargeting':function() {return this;},
				'collapseEmptyDivs':function() {return this;},
				'enableServices':function() {return this;},
				'defineSlot':function(name,dimensions,id) {
					window.googletag.ads.push(id);
					window.googletag.ads[id] = {
						'renderEnded':function(){},
						'addService':function() {return this;}
					};
					return window.googletag.ads[id];
				},
				'display':function(id) {
					window.googletag.ads[id].renderEnded.call(dfpScript);
					return this;
				}

			};

			// Execute any stored commands
			$.each(commands,function(k,v){
				window.googletag.cmd.push(v);
			});

		},50);

	};

	// Create jQuery function
	$.dfp = $.fn.dfp = function(id,options) {

		options = options || {};

		if(typeof id === 'undefined') {
			id = dfpID;
		}

		if(typeof id === 'object') {
			options = id;
			id = options.dfpID || dfpID;
		}

		var selector = this;

		if(typeof this === 'function') {
			selector = dfpSelector;
		}

		init(id,selector,options);

	};

})(window.jQuery,window);

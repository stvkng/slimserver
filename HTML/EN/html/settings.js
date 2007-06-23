[%- FILTER null %]
	[% BLOCK addSetupCaseLinks %]
		[% IF setuplinks %]
			[% FOREACH setuplink = setuplinks %]
			case "[% setuplink.key %]":
				url = "[% webroot %][% setuplink.value %]"
				page = "[% setuplink.key %]"
				suffix = "page=" + page
				[% IF cookie %]homestring = "[% setuplink.key | string %]"
				cookie = [% cookie %][% END %]
			break;
			[% END %]
		[% END %]
	[% END %]
[% END -%]

function chooseSettings(value,option)
{
	var url;

	switch(option)
	{
		[% IF playerid -%]
			[% PROCESS addSetupCaseLinks setuplinks=additionalLinks.playersetup  %]
		[%- ELSE -%]
			[% PROCESS addSetupCaseLinks setuplinks=additionalLinks.setup   %]
		[%- END %]

		case "HOME":
			url = "[% webroot %]home.html?"
		break
	}

	if (option) {
		// change the mouse cursor so user gets some feedback
		$('settingsForm').setStyle({cursor:'wait'});
		new Ajax.Updater( { success: 'settingsRegion' }, url, {
			method: 'post',
			postBody: 'ajaxUpdate=1&player=[% playerURI %][% IF playerid %]&playerid=[% playerid | uri %][% END %]',
			evalScripts: true,
			asynchronous: true,
			onFailure: function(t) {
				alert('Error -- ' + t.responseText);
			},
			onComplete: function(t) {
				$('settingsForm').setStyle({cursor:'auto'});
				$('statusarea').update('');
			}
		} );
		document.forms.settingsForm.action = url;
	}
}

function prefValidate(myPref, namespace) {
	new Ajax.Request('/jsonrpc.js', {
		method: 'post',

		postBody: Object.toJSON({
			id: 1, 
			method: 'slim.request', 
			params: [
				'', 
				[
					'pref', 
					'validate', 
					namespace + ':' + myPref.name, 
					myPref.value
				]
			]
		}),

		onSuccess: function(response) {
			var json = response.responseText.evalJSON();

			// preference did not validate - highlight the field
			highlightField(myPref, (json.result.valid == '1'));
		}
	});
}

function resizeSettingsSection() {
	var winHeight = (
		document.documentElement && document.documentElement.clientHeight
		? parseInt(window.innerHeight, 10)
		: parseInt(document.body.offsetHeight, 10)
	);
	var settingsTop = Position.cumulativeOffset($('settingsRegion'))[1];
	var submitHeight = $('prefsSubmit').offsetHeight + 10;

	if ((winHeight - parseInt(settingsTop, 10) - parseInt(submitHeight, 10)) > 0) {
		$('settingsRegion').setStyle({
			'height': (winHeight - parseInt(settingsTop, 10) - parseInt(submitHeight, 10)) + 'px'
		});
	}
}

function initSettingsForm() {
	// try to redirect all form submissions by return key to the default submit button
	// listen for keypress events on all form elements except submit
	$('settingsForm').getElements().each(function(ele) {
		if (ele.type != 'submit') {
			new Event.observe(ele, 'keypress', function(e) {
				var cKeyCode = e.keyCode || e.which;
				if (cKeyCode == Event.KEY_RETURN) {
					Event.stop(e);
					$('saveSettings').activate();
				}
			});
		}
	});
	
	new Event.observe('choose_setting', 'keypress', function(e){ 
		var cKeyCode = e.keyCode || e.which;
		if (cKeyCode == Event.KEY_UP || cKeyCode == Event.KEY_DOWN) {
			Event.stop(e);
			var t = $('choose_setting');
			chooseSettings(t.selectedIndex,t.options[t.selectedIndex].value);
		}
	});

	// resize the scrolling part of the settings page
	new Event.observe(window, 'resize', function(){resizeSettingsSection();});

	if ($('saveSettings')) {
		new Event.observe('saveSettings', 'click', function(e){
			Event.stop(e);
			if ($('settingsForm').page.value != 'PLUGINS') {
				$('settingsForm').setStyle({cursor:'wait'});
				$('settingsForm').request({
					parameters: { useAJAX: 1, rescan: '' },
					onComplete: function(response) {
						var results = parseData(response.responseText);
		
						$('statusarea').update(results['warning']);
						resizeSettingsSection();
		
						// highlight fields
						for (field in results) {
							if ($(field)) {
								highlightField($(field), (results[field] == '1'));
							}
						}
		
						$('settingsForm').setStyle({cursor:'auto'});
					}
				});
			}
		});
	}

	resizeSettingsSection();
};

var bgColors = new Array;
function highlightField(field, valid) {
	if (!bgColors[field]) {
		bgColors[field] = field.getStyle('backgroundColor'); 
	}

	if (valid) {
		// restore the background before calling the effect
		// using it as targetcolor didn't work
		field.setStyle({backgroundColor: bgColors[field]});
		new Effect.Highlight(field, {
			duration: 0.5,
			startcolor: '#99ff99'
		});
	}
	else {
		field.setStyle({backgroundColor: '#ffcccc'});
	}
}

Ajax.FileSelector = Class.create();
Object.extend(Object.extend(Ajax.FileSelector.prototype, Ajax.Autocompleter.prototype), {
	initialize: function(element, foldersOnly) {
		this.baseInitialize(element, 'fileselector', {
				paramName: 'currDir',
				parameters: (foldersOnly ? 'foldersonly=1' : ''),
				frequency: 0.7,
				indicator: $('fileselectorindicator'),
				afterUpdateElement: function(item) {
					if (bgColors[item])
						item.setStyle({backgroundColor: bgColors[item]});
					item.focus();
				}
			}
		);
		this.options.asynchronous = true;
		this.options.onComplete = this.onComplete.bind(this);
		this.url = '/settings/server/fileselector.html';
	},

	startIndicator: function() {
		var indicatorStyle = this.options.indicator.style;
		Position.clone(this.element, this.options.indicator, {
			setHeight: false,
			setWidth: false,
			offsetLeft: this.element.offsetWidth
		});
		this.options.indicator.style.position = 'absolute';
		Element.show(this.options.indicator);
	}
});

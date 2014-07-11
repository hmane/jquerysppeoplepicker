jquerysppeoplepicker
====================

Project Description
--------------------------------------
jQuery PeoplePicker creates tokenized input for user/group with picture and presence. Original jQuery Token Input plugn - [jQuery Tokeninput plugin site](http://loopj.com/jquery-tokeninput/)

Features
--------------------------------------

jQuery tokenized PeoplePicker for SP 2013 with picture and presence.

Prerequisites
--------------------------------------

- SharePoint 2013
- JQuery 1.8.x +

Installation
--------------------------------------

- Copy jquery.peoplepicker.js, imgPreload.js, token-input.css & spinner.gif to Site.
- Add reference to the page
```html
<script src="http://code.jquery.com/jquery-1.8.3.min.js" type="text/javascript"></script>
<script src="/SiteAssets/jquery.peoplepicker.js" type="text/javascript"></script>
<script src="/SiteAssets/imgPreload.js" type="text/javascript"></script>
<link href="/SiteAssets/css/token-input.css" type="text/css" rel="stylesheet" />
```

- Add following JavaScript
```js
jQuery(document).ready(function () {
	jQuery(".inputPeoplePicker").peoplePicker();
});
```
![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874975)

![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874976)

![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874977)

![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874978)

![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874979)

![](https://www.codeplex.com/Download?ProjectName=jquerysppeoplepicker&DownloadId=874980)


Configuration
---------------------------------

###Following options are available:###

**searchDelay**

    The delay, in milliseconds, between the user finishing typing and the search being performed. default: The minimum number of characters the user must enter before a search is performed._default: **1**_

**minChars**

    The minimum number of characters the user must enter before a search is performed. _default: **1**_

**principalType**

    Principal type to search. _default: **0**_
* 0 - [User, DL, SecGroup, SPGroup]
* 1 - [User]
* 2 - [DL]
* 4 - [SecGroup]
* 8 - [SPGroup]

**hintText**

    The text to show in the dropdown label which appears when you first click in the search field. _default: **Type in a user/group name**_

**mySiteHostUrl**

My site host url to pull the user picter. _default: **""**_

**noResultsText**

The text to show in the dropdown label when no results are found which match the current query. _default: **No Results**_

**searchingText**

The text to show in the dropdown label when a search is currently in progress. _default: **"Searching..."**_

**deleteText**

The text to show on each token which deletes the token when clicked. If you wish to hide the delete link, provide an empty string here. Alternatively you can provide a html string here if you would like to show an image for deleting tokens. _default: **x**_

**animateDropdown**

Set this to false to disable animation of the dropdown _default: **true**_

**tokenLimit**

The maximum number of results allowed to be selected by the user. Use null to allow unlimited selections. _default: **10**_

**tokenDelimiter**

The separator to use when sending the results back to the server. _default: **;**_

**prePopulate**

Prepopulate the peoplePicker with existing data. Set to an array of JSON objects, eg: [{"id": "i:0#.w|Domain\User", "value": "User Title", "email": "user@domain.com", "networkaddress": "domain\username", "sip": "sip@domain.com" }] to pre-fill the input. _default: **null**_

Callbacks
--------------------------------------

**onAdd**

A function to call whenever the user adds another token to their selections. _default: **null**_

**onDelete**

A function to call whenever the user removes a token from their selections. _default: **null**_ 

**onReady**

A function to call after initialization is done and the peoplePicker is ready to use. _default: **null**_

Methods
--------------------------------

Add a new token to the peoplePicker with id x and name y.

`selector.peoplePicker("add", {id: x, name: y});`

Remove the tokens with id x from the peoplePicker.

`selector.peoplePicker("remove", {id: x});`

Remove the tokens with name y from the peoplePicker.

`selector.peoplePicker("remove", {name: y});`

Clear all tokens from the peoplePicker.

`selector.peoplePicker("clear");`

Gets the array of selected tokens from the peoplePicker (each item being an object of the kind {"id": "i:0#.w|Domain\User", "value": "User Title", "email": "user@domain.com", "networkaddress": "domain\username", "sip": "sip@domain.com" }).

`selector.peoplePicker("get");`

jQuery PeoplePicker also uses [imgPreload plugin](http://denysonique.github.io/imgPreload/) to show spinner before loading the user picture.

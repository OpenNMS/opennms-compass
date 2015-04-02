<a name="2.0.0"</a>
## 2.0.0 (2015-04-02)


#### Bug Fixes


* **alarms**  simplify alarm loading code to avoid spinner issues ((b3a1d078))
* **dashboard**
  *  fix data merge issue on update ((0d63342c))
  *  fix spacing of server name ((51c89f80))
* **settings**
  *  "Go" button closes the keyboard ((a64a4c8e))
  *  edit settings multiple times failed ((c08bab01))
  *  remove default demo settings, pop-up settings on first launch ((1793ac42))

#### Features


* ****  allow rotation on phones as well as tablets ((afdebba4))
* **dashboard**  server name is always visible ((981ca2cb))
* **info**  change error popup to an info/about popup ((f8911ee2))



<a name="1.9.5"</a>
## 1.9.5 (2015-03-27)


#### Bug Fixes


* ****  modal windows now fill the screen on tablets ((6933c6fd))
* **alarms**
  *  clean up the alarm URLs ((980a515a))
  *  leaving alarms view does not refresh dashboard ((2be1d401))
  *  legend should show all alarm types ((0bfb827a))
* **dashboard**
  *  a few visual tweaks to availability ((9f42cad6))
  *  alarm donut clickable; pulls up to 100 alarms ((357c2ac0))
  *  alarm donut should be WARNING or higher ((70315a51))
  *  clear availability error on success ((2ffca0b5))
  *  donuts should not draw on each other (COMPASS-27) ((948d9b69))
  *  fit better, also fix over-refreshing ((88c87b29))
  *  fix formatting of donuts with no data ((9a4dc1cc))
  *  fix layout issues when server is unreachable ((61e44644))
  *  fix the donut overlay issue ((ef29d985))
  *  increase the hit area for the slider arrows ((52d16b25))
* **iap**  improve error handling in IAP, report some errors in the UI ((ce66d9ec))
* **nodes**  hide the keyboard before showing node details ((082600d7))

#### Features


* **alarms**
  *  show a legend of number of alarms by severity at the top ((e64a186b))
  *  the legend now toggles viewing those alarm types ((81bed828))
* **dashboard**
  *  add a chevron to indicate donut slidability ((75fb1efd))
  *  add an alarm donut in a slide-box (COMPASS-9) ((37e5aa71))
  *  landscape mode shows both donuts ((d88ff79b))
* **errors**  allow clearing of errors from the error UI ((e8358a1b))
* **outages**  clicking node/interface opens node detail ((6898f877))



<a name="1.9.4"</a>
## 1.9.4 (2015-03-19)


#### Bug Fixes


* ****  fix loading spinners ((04835e0b))
* **ads**
  *  handle the settings changed event better ((13b2891f))
  *  re-check if ads should show when settings change ((d0adc1a4))
* **alarms**
  *  OK, really fix the alarm spinner now ((76f1f0c6))
  *  make sure spinner always disappears ((65383b4b))
  *  fix node link in alarm detail ((4e767e1a))
* **dashboard**
  *  reinitialize logo on settings change ((5d787807))
  *  if data has changed, do a redraw ((eee8267a))
* **errors**  fix error display ((d5e58944))
* **info**  recheck serve info on settings change ((d0a1cc31))
* **navigation**  disable swipe-to-go-back (COMPASS-23) ((03b4ce30))
* **nodes**
  *  make node detail popup appear immediately ((343969e6))
  *  don't spin forever (COMPASS-21) ((b10131ff))

#### Features


* ****  switch all UIs to pull-to-refresh (COMPASS-15) ((0be2f79d))
* **ads**
  *  working IAP for disabling ads on iOS ((dc3cf5b6))
  *  ads can be removed if the old OpenNMS app is detected ((2115df16))
* **alarms**  add alarm details view ((d69160ac))
* **dashboard**
  *  move the hostname to the top of tho dashboard (COMPASS-24) ((b62bcbe8))
* **framework**  updated to latest ionic master ((9ab72f2c))
* **outages**  click outage donut -> nodes-with-outages ((0e55c776))
* **settings**  make refresh interval user-modifiable + clean up handling of changed settings ((2d740b02))
* **theme**  theme support for horizon vs. meridian (COMPASS-4) ((f066f4bf))



<a name="1.9.3"</a>
## 1.9.3 (2015-02-22)


#### Bug Fixes


* **alarms**
  *  fix failure when iterating over alarms (COMPASS-1) ((81727af4))
  *  track alarm by id to fix animation bug ((95d97c6e))
  *  fix a number of small alarm bugs ((b01d5b9c))
* **dashboard**
  *  fix padding around donut causing it to not be centered ((7c6a8656))
  *  show an empty donut when there are 0 outages ((8e9279fa))
  *  don't show 'Loading' forever if connection fails ((849a2d93))
* **errors**  add an API for querying whether a subsystem is in-error ((93c7d664))
* **navigation**
  *  re-align the titles to the center to avoid overlap ((23b8c34d))
  *  make sure alarm/node header buttons are always left/right ((58881fd2))
* **nodes**  fix initialization/display of foreign source ((aa9b2580))
* **rest**  set a default timeout for ReST requests ((efb64be0))

#### Features


* ****  Switch to "OpenNMS Compass" ((240d6751))
* **alarms**  give an error message when permission denied escalating/acking ((2213337a))
* **dashboard**
  *  show availability (when possible) ((b986f33b))
  *  show server name in outage display ((87e41f6b))
* **icon**  Set icon name on iOS properly ((53fa10b9))
* **nodes**  implement node detail view ((7cf51b09))
* **rest**  encapsulate errors into an object ((a4e2f67d))



<a name="1.9.2"</a>
## 1.9.2 (2015-02-13)


#### Bug Fixes


* **dashboard**
  *  move the "N Outages" title to the bottom of the graph ((af674a69))
  *  better feedback when refreshing or reloading view ((23c1ba2f))
* **navigation**  make sure settings/alarms go back the right way ((54a70aa4))
* **nodes**  use ng-show rather than ng-if so we do not create multiple spinners ((13bd8411))

#### Features


* **alarms**  acknowledge/escalate working, also some ReST refactor ((ace1cac0))
* **dashboard**
  *  add horizon/meridian logo as appropriate ((8250565f))
  *  replace donut code with nicer d3pie implementation ((8af92f3d))
* **errors**
  *  better error handling, UI for viewing errors ((348bf898))
  *  throw an event when error status changes ((fe5670e0))
* **icon**  fix icon background to be white ((4e0b6eea))
* **nodes**
  *  add basic node list/search ((0c0746ed))
  *  add mocked node page, rearrange UI ((5ec3bc58))
* **rest**  better error messages from failed ReST calls ((f746f126))



<a name="1.9.1"</a>
## 1.9.1 (2015-01-23)


#### Bug Fixes


* ****  got the alarm list working, lots of other polish ((564a2b63))
* **outages**  only get *current* outages ((02bfc2a4))
* **settings**  fix typo on default config load ((c4824d1d))

#### Features


* **alarms**
  *  alarm filtering, pull-to-refresh, infinite load ((708c9a21))
  *  alarm list severity coloring ((7699faa5))
  *  simple alarm list ((8e7563d9))




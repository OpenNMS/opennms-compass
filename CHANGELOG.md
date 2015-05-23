<a name="2.0.5"</a>
## 2.0.5 (2015-05-23)


#### Bug Fixes


* **ads**  another attempted fix at cleaning up initialization ((9b638c26))
* **settings**  make sure server info is updated when displaying in "about" (COMPASS-46) ((a5702fc2))

#### Features


* **settings**  move "about" info to a settings tab ((26044e04))



<a name="2.0.4"</a>
## 2.0.4 (2015-05-21)


#### Bug Fixes


* **ads**  fix initialization/update of ads (COMPASS-47) ((d5606eba))
* **dashboard**  move the donut arrows a few pixels out of the way ((a5778369))
* **errors**  only broadcast opennms.errors.updated on changes ((3260dcb0))



<a name="2.0.3"</a>
##  (2015-05-14)


#### Bug Fixes


* **outages**  do not pop up outages when not supported (COMPASS-42) ((37220beb))
* **info**  Fix geolocation warning for OpenNMS 16 (COMPASS-46) ((a4e8d972))



<a name="2.0.2"</a>
## 2.0.2 (2015-05-11)


#### Features


* **iap**  add a "restore purchases" button (COMPASS-45) ((1f6c88b5))



<a name="2.0.1"</a>
## 2.0.1 (2015-05-01)


#### Bug Fixes


* **ads**  back off cordova-android to 3.7.1 to fix ad placement (COMPASS-44) ((89c56834))
* **alarms**  better error reporting for alarm permissions errors ((2ed68cd5))
* **info**  better reporting of unknown OpenNMS version(s) (COMPASS-43) ((951ef59a))
* **outages**  clicking any info in the outage popup takes you to the appropriate node (COMPASS-39) ((fc9cbc30))
* **rest**
  *  only use Cordova HTTP on Android (iOS does not support timeouts) ((39223d07))
  *  use cordova-HTTP for permissive-SSL ReST calls (COMPASS-40) ((c103e8a4))
* **settings**  make the tabs a little more obvious ((f9f72a48))

#### Features


* **nodes**  make the search a substring search rather than starts-with (COMPASS-41) ((cf356e09))



<a name="2.0.0"</a>
## 2.0.0 (2015-04-13)


#### Bug Fixes


* **ads**  Don't minify BuildConfig.js ((bb810a07))
* **alarms**  make sure refresh happens after alarm modification (COMPASS-38) ((ba1596d6))
* **dashboard**
  *  make alarm donut say "Pending Problems" like the OpenNMS UI (COMPASS-34) ((0770e753))
  *  shrink fonts to fit on iPhone 4S ((19209605))
  *  sometimes donuts would not render after rotate ((a6d441a7))
* **info**
  *  fix "availability" notice (COMPASS-35) ((11432917))
  *  fix word-wrap for long server names ((ff4a0d80))
* **ios**
  *  fix orientation parsing on fresh install ((617c4be7))
  *  support rotation on iPhone ((f6a49209))
* **launch**  make portrait the first orientation ((1de543cd))
* **nodes**
  *  handle NPE checking addresses ((927d9d46))
  *  node list refreshes on settings change ((4021965d))
* **settings**  don't autocorrect username ((2343683f))
* **styles**  correct meridian/horizon blue+fix alarm detail ((2787c862))

#### Features


* **dashboard**  clicking server name launches opennms in a browser ((ba4146a5))
* **info**  add server information to the info popup ((f730bb0c))
* **nodes**
  *  better node list layout in landscape mode ((13857c30))
  *  set node geolocation with a button ((7f95d42f))
* **settings**  settings are tabbed so purchases are less in-your-face ((9dc32bda))




<a name="2.0.1"</a>
## 2.0.1 (2015-05-01)


#### Bug Fixes


* **ads**  back off cordova-android to 3.7.1 to fix ad placement (COMPASS-44) ((89c56834))
* **alarms**  better error reporting for alarm permissions errors ((2ed68cd5))
* **info**  better reporting of unknown OpenNMS version(s) (COMPASS-43) ((951ef59a))
* **outages**  clicking any info in the outage popup takes you to the appropriate node (COMPASS-39) ((fc9cbc30))
* **rest**  use cordova-HTTP for permissive-SSL ReST calls (COMPASS-40) ((c103e8a4))
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




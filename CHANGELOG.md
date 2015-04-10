<a name="2.0.0"</a>
## 2.0.0 (2015-04-10)


#### Bug Fixes


* **ads**  Don't minify BuildConfig.js ((bb810a07))
* **dashboard**
  *  make alarm donut say "Pending Problems" like the OpenNMS UI (COMPASS-34) ((0770e753))
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

#### Features


* **dashboard**  clicking server name launches opennms in a browser ((ba4146a5))
* **info**  add server information to the info popup ((f730bb0c))
* **nodes**
  *  better node list layout in landscape mode ((13857c30))
  *  set node geolocation with a button ((7f95d42f))
* **settings**  settings are tabbed so purchases are less in-your-face ((9dc32bda))




<a name="2.1.0"></a>
# [2.1.0](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-394...v2.1.0) (2016-03-03)


### Bug Fixes

* **dashboard:** huge cleanup of dashboard behavior, plus a few other small bugfixes ([c696f39](https://github.com/OpenNMS/opennms-compass/commit/c696f39))
* **graphs:** cleaned up graphs some more, now able to make HTTP calls without AJAX/CORS issue ([c7da878](https://github.com/OpenNMS/opennms-compass/commit/c7da878))

### Features

* disable ads and in-app-purchases ([35c42d5](https://github.com/OpenNMS/opennms-compass/commit/35c42d5))

### Performance Improvements

* convert to webpack ([19bc97c](https://github.com/OpenNMS/opennms-compass/commit/19bc97c))



<a name="2.1.0-394"></a>
# [2.1.0-394](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-393...v2.1.0-394) (2015-10-27)


### Features

* **android:** use Crosswalk to improve performance on old Android versions ([5b34e7f](https://github.com/OpenNMS/opennms-compass/commit/5b34e7f))



<a name="2.1.0-393"></a>
# [2.1.0-393](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-392...v2.1.0-393) (2015-10-16)


### Bug Fixes

* **db:** fix missing lokijs metadata on update of existing servers ([7fa173f](https://github.com/OpenNMS/opennms-compass/commit/7fa173f))
* **db:** lokijs adapters work with serialized JSON ([6e6a77a](https://github.com/OpenNMS/opennms-compass/commit/6e6a77a))
* **db:** work around LokiJS dynamic view error ([72a99ef](https://github.com/OpenNMS/opennms-compass/commit/72a99ef))
* **nodes:** allow touch events to pass through the map for scrolling ([ba25231](https://github.com/OpenNMS/opennms-compass/commit/ba25231))
* **nodes:** fix a pull-to-refresh bug ([f1fc232](https://github.com/OpenNMS/opennms-compass/commit/f1fc232))
* **settings:** fix server display and first-launch issues ([c6552e2](https://github.com/OpenNMS/opennms-compass/commit/c6552e2))

### Features

* try to use San Francisco font on iOS 9 ([d8c5c84](https://github.com/OpenNMS/opennms-compass/commit/d8c5c84))
* **dashboard:** show a caret on the server-chooser ([01690c3](https://github.com/OpenNMS/opennms-compass/commit/01690c3))
* **nodes:** show map of node location if lat/lon is set ([1e66cc5](https://github.com/OpenNMS/opennms-compass/commit/1e66cc5))
* **settings:** add "grab" icon on the server list ([442edeb](https://github.com/OpenNMS/opennms-compass/commit/442edeb))



<a name="2.1.0-392"></a>
# [2.1.0-392](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-391...v2.1.0-392) (2015-09-10)


### Bug Fixes

* **graphs:** set display=true by default in the graph widget ([9ed332f](https://github.com/OpenNMS/opennms-compass/commit/9ed332f))
* **outages:** fix outages popup on donut tap ([7c32adf](https://github.com/OpenNMS/opennms-compass/commit/7c32adf))
* **servers:** fix "server updated" check handling ([7f829f7](https://github.com/OpenNMS/opennms-compass/commit/7f829f7))
* **settings:** hide "Add" button unless on the settings tab ([325d325](https://github.com/OpenNMS/opennms-compass/commit/325d325))
* **settings:** store default server in a non-cloud file ([17d9b7e](https://github.com/OpenNMS/opennms-compass/commit/17d9b7e))

### Features

* **graphs:** set a min/max date so we don't overload the graphs ([ab25e34](https://github.com/OpenNMS/opennms-compass/commit/ab25e34))
* **graphs:** sort favorited graphs by node label and title ([454c697](https://github.com/OpenNMS/opennms-compass/commit/454c697))
* **graphs:** working DC-based graphing, with date ranges enabled ([51984f1](https://github.com/OpenNMS/opennms-compass/commit/51984f1))
* **nodes:** make node loading less jarring visually ([b46c46b](https://github.com/OpenNMS/opennms-compass/commit/b46c46b))



<a name="2.1.0-391"></a>
# [2.1.0-391](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-390...v2.1.0-391) (2015-07-23)


### Bug Fixes

* **servers:** only refresh when default server changes ([00a5f00](https://github.com/OpenNMS/opennms-compass/commit/00a5f00))



<a name="2.1.0-390"></a>
# [2.1.0-390](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-389...v2.1.0-390) (2015-07-23)


### Bug Fixes

* **dashboard:** don't let 'loading' block forever ([04d520a](https://github.com/OpenNMS/opennms-compass/commit/04d520a))
* **dashboard:** extend debounce to avoid flash when refreshing ([6ea0433](https://github.com/OpenNMS/opennms-compass/commit/6ea0433))
* **favorites:** fix removing favorites ([6b2bea0](https://github.com/OpenNMS/opennms-compass/commit/6b2bea0))
* **iap:** re-add missing IAP call ([05e5545](https://github.com/OpenNMS/opennms-compass/commit/05e5545))
* **servers:** fix an initialization issue on clean install ([fa47035](https://github.com/OpenNMS/opennms-compass/commit/fa47035))
* **servers:** handle renames gracefully ([cba2759](https://github.com/OpenNMS/opennms-compass/commit/cba2759))

### Features

* **favorites:** store favorites in the filesystem ([2890537](https://github.com/OpenNMS/opennms-compass/commit/2890537))
* **settings:** allow configuration of multiple servers (COMPASS-30) ([50fcd85](https://github.com/OpenNMS/opennms-compass/commit/50fcd85))
* **settings:** store settings in a cloud-sync-capable directory ([dae2230](https://github.com/OpenNMS/opennms-compass/commit/dae2230))
* **util:** add onServerRemoved, also disable native keyboard scroll ([9321ebe](https://github.com/OpenNMS/opennms-compass/commit/9321ebe))



<a name="2.1.0-389"></a>
# [2.1.0-389](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-387...v2.1.0-389) (2015-07-09)


### Bug Fixes

* **availability:** checkAvailability expects XML, not JSON ([9c36fff](https://github.com/OpenNMS/opennms-compass/commit/9c36fff))
* **graphs:** fix minify mangling of backshift lib that could cause failures ([f246462](https://github.com/OpenNMS/opennms-compass/commit/f246462))
* **nodes:** don't clean up view data until they are not visible ([8da8ad9](https://github.com/OpenNMS/opennms-compass/commit/8da8ad9))
* **rest:** fix iOS ReST breakage introduced by cordovaHTTP refactor ([51c75b9](https://github.com/OpenNMS/opennms-compass/commit/51c75b9))
* **rest:** handle unusual payloads better ([b8847ff](https://github.com/OpenNMS/opennms-compass/commit/b8847ff))

### Features

* **core:** add support for Ionic Deploy ([e8a1675](https://github.com/OpenNMS/opennms-compass/commit/e8a1675))
* **nodes:** query the first 20 if no search is present ([51649e5](https://github.com/OpenNMS/opennms-compass/commit/51649e5))



<a name="2.1.0-387"></a>
# [2.1.0-387](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-386...v2.1.0-387) (2015-07-07)


### Bug Fixes

* **dashboard:** handle rejection better ([dd15194](https://github.com/OpenNMS/opennms-compass/commit/dd15194))

### Features

* **startup:** fancier splash screen initialization ([aa22467](https://github.com/OpenNMS/opennms-compass/commit/aa22467))



<a name="2.1.0-386"></a>
# [2.1.0-386](https://github.com/OpenNMS/opennms-compass/compare/v2.1.0-384...v2.1.0-386) (2015-07-06)


### Bug Fixes

* missing dependency on SSL/HTTP framework ([a70cf6d](https://github.com/OpenNMS/opennms-compass/commit/a70cf6d))
* **config:** fix settings-check (fixes initialization against Meridian) ([1d78993](https://github.com/OpenNMS/opennms-compass/commit/1d78993))



<a name="2.1.0-384"></a>
# [2.1.0-384](https://github.com/OpenNMS/opennms-compass/compare/v2.0.6-383...v2.1.0-384) (2015-06-27)


### Features

* **graphs:** add support for showing graphs from 16.0.0 and higher ([487cbc2](https://github.com/OpenNMS/opennms-compass/commit/487cbc2))



<a name="2.0.6-383"></a>
## [2.0.6-383](https://github.com/OpenNMS/opennms-compass/compare/v2.0.6-382...v2.0.6-383) (2015-06-04)


### Bug Fixes

* **config:** Android does not seem to like "new RegExp" ([efb1d75](https://github.com/OpenNMS/opennms-compass/commit/efb1d75))
* **dashboard:** don't show {{serverName}} if server has not been configured ([dfa791d](https://github.com/OpenNMS/opennms-compass/commit/dfa791d))
* **settings:** fix error checking server URL change ([d2fdc3e](https://github.com/OpenNMS/opennms-compass/commit/d2fdc3e))
* **ssl:** handle some SSL server types better ([4abb84a](https://github.com/OpenNMS/opennms-compass/commit/4abb84a))

### Features

* track basic metrics for navigation ([50f9909](https://github.com/OpenNMS/opennms-compass/commit/50f9909))



<a name="2.0.6-381"></a>
## [2.0.6-381](https://github.com/OpenNMS/opennms-compass/compare/v2.0.5-380...v2.0.6-381) (2015-05-27)




<a name="2.0.5-380"></a>
## [2.0.5-380](https://github.com/OpenNMS/opennms-compass/compare/v2.0.5-379...v2.0.5-380) (2015-05-26)


### Bug Fixes

* **launch:** move 3rd-party scripts into <head> for faster loading ([741ce8e](https://github.com/OpenNMS/opennms-compass/commit/741ce8e))



<a name="2.0.5-379"></a>
## [2.0.5-379](https://github.com/OpenNMS/opennms-compass/compare/v2.0.5-377...v2.0.5-379) (2015-05-26)


### Bug Fixes

* **ads:** another attempted fix at cleaning up initialization ([9b638c2](https://github.com/OpenNMS/opennms-compass/commit/9b638c2))
* **launch:** fix a jQuery initialization issue ([ec97318](https://github.com/OpenNMS/opennms-compass/commit/ec97318))



<a name="2.0.5-377"></a>
## [2.0.5-377](https://github.com/OpenNMS/opennms-compass/compare/v2.0.4-376...v2.0.5-377) (2015-05-21)


### Bug Fixes

* **settings:** make sure server info is updated when displaying in "about" (COMPASS-46) ([a5702fc](https://github.com/OpenNMS/opennms-compass/commit/a5702fc))

### Features

* **settings:** move "about" info to a settings tab ([26044e0](https://github.com/OpenNMS/opennms-compass/commit/26044e0))



<a name="2.0.4-376"></a>
## [2.0.4-376](https://github.com/OpenNMS/opennms-compass/compare/v2.0.3-374...v2.0.4-376) (2015-05-21)


### Bug Fixes

* **ads:** fix initialization/update of ads (COMPASS-47) ([d5606eb](https://github.com/OpenNMS/opennms-compass/commit/d5606eb))
* **dashboard:** move the donut arrows a few pixels out of the way ([a577836](https://github.com/OpenNMS/opennms-compass/commit/a577836))
* **errors:** only broadcast opennms.errors.updated on changes ([3260dcb](https://github.com/OpenNMS/opennms-compass/commit/3260dcb))



<a name="2.0.3-374"></a>
## [2.0.3-374](https://github.com/OpenNMS/opennms-compass/compare/v2.0.2-373...v2.0.3-374) (2015-05-14)


### Bug Fixes

* **info:** Fix geolocation warning for OpenNMS 16 (COMPASS-46) ([a4e8d97](https://github.com/OpenNMS/opennms-compass/commit/a4e8d97))
* **outages:** do not pop up outages when not supported (COMPASS-42) ([37220be](https://github.com/OpenNMS/opennms-compass/commit/37220be))



<a name="2.0.2-373"></a>
## [2.0.2-373](https://github.com/OpenNMS/opennms-compass/compare/v2.0.1-372...v2.0.2-373) (2015-05-11)


### Features

* **iap:** add a "restore purchases" button (COMPASS-45) ([1f6c88b](https://github.com/OpenNMS/opennms-compass/commit/1f6c88b))



<a name="2.0.1-372"></a>
## [2.0.1-372](https://github.com/OpenNMS/opennms-compass/compare/v2.0.1-371...v2.0.1-372) (2015-05-01)


### Bug Fixes

* **rest:** only use Cordova HTTP on Android (iOS does not support timeouts) ([39223d0](https://github.com/OpenNMS/opennms-compass/commit/39223d0))



<a name="2.0.1-371"></a>
## [2.0.1-371](https://github.com/OpenNMS/opennms-compass/compare/v2.0.1-370...v2.0.1-371) (2015-05-01)


### Bug Fixes

* **outages:** clicking any info in the outage popup takes you to the appropriate node (COMPASS ([fc9cbc3](https://github.com/OpenNMS/opennms-compass/commit/fc9cbc3))



<a name="2.0.1-370"></a>
## [2.0.1-370](https://github.com/OpenNMS/opennms-compass/compare/v2.0.1-36...v2.0.1-370) (2015-05-01)


### Bug Fixes

* **ads:** back off cordova-android to 3.7.1 to fix ad placement (COMPASS-44) ([89c5683](https://github.com/OpenNMS/opennms-compass/commit/89c5683))
* **settings:** make the tabs a little more obvious ([f9f72a4](https://github.com/OpenNMS/opennms-compass/commit/f9f72a4))



<a name="2.0.1-36"></a>
## [2.0.1-36](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-35...v2.0.1-36) (2015-04-29)


### Bug Fixes

* **alarms:** better error reporting for alarm permissions errors ([2ed68cd](https://github.com/OpenNMS/opennms-compass/commit/2ed68cd))
* **info:** better reporting of unknown OpenNMS version(s) (COMPASS-43) ([951ef59](https://github.com/OpenNMS/opennms-compass/commit/951ef59))
* **rest:** use cordova-HTTP for permissive-SSL ReST calls (COMPASS-40) ([c103e8a](https://github.com/OpenNMS/opennms-compass/commit/c103e8a))

### Features

* **nodes:** make the search a substring search rather than starts-with (COMPASS-41) ([cf356e0](https://github.com/OpenNMS/opennms-compass/commit/cf356e0))



<a name="2.0.0-35"></a>
# [2.0.0-35](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-34...v2.0.0-35) (2015-04-13)


### Bug Fixes

* **dashboard:** shrink fonts to fit on iPhone 4S ([1920960](https://github.com/OpenNMS/opennms-compass/commit/1920960))
* **styles:** correct meridian/horizon blue+fix alarm detail ([2787c86](https://github.com/OpenNMS/opennms-compass/commit/2787c86))



<a name="2.0.0-34"></a>
# [2.0.0-34](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-33...v2.0.0-34) (2015-04-10)


### Bug Fixes

* **alarms:** make sure refresh happens after alarm modification (COMPASS-38) ([ba1596d](https://github.com/OpenNMS/opennms-compass/commit/ba1596d))



<a name="2.0.0-33"></a>
# [2.0.0-33](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-32...v2.0.0-33) (2015-04-10)


### Bug Fixes

* **dashboard:** make alarm donut say "Pending Problems" like the OpenNMS UI (COMPASS-34) ([0770e75](https://github.com/OpenNMS/opennms-compass/commit/0770e75))
* **info:** fix "availability" notice (COMPASS-35) ([1143291](https://github.com/OpenNMS/opennms-compass/commit/1143291))



<a name="2.0.0-32"></a>
# [2.0.0-32](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-31...v2.0.0-32) (2015-04-10)


### Bug Fixes

* **launch:** make portrait the first orientation ([1de543c](https://github.com/OpenNMS/opennms-compass/commit/1de543c))

### Features

* **settings:** settings are tabbed so purchases are less in-your-face ([9dc32bd](https://github.com/OpenNMS/opennms-compass/commit/9dc32bd))



<a name="2.0.0-31"></a>
# [2.0.0-31](https://github.com/OpenNMS/opennms-compass/compare/v2.0.0-30...v2.0.0-31) (2015-04-06)


### Bug Fixes

* **ads:** Don't minify BuildConfig.js ([bb810a0](https://github.com/OpenNMS/opennms-compass/commit/bb810a0))
* **info:** fix word-wrap for long server names ([ff4a0d8](https://github.com/OpenNMS/opennms-compass/commit/ff4a0d8))
* **ios:** fix orientation parsing on fresh install ([617c4be](https://github.com/OpenNMS/opennms-compass/commit/617c4be))
* **nodes:** handle NPE checking addresses ([927d9d4](https://github.com/OpenNMS/opennms-compass/commit/927d9d4))
* **nodes:** node list refreshes on settings change ([4021965](https://github.com/OpenNMS/opennms-compass/commit/4021965))
* **settings:** don't autocorrect username ([2343683](https://github.com/OpenNMS/opennms-compass/commit/2343683))

### Features

* **nodes:** better node list layout in landscape mode ([13857c3](https://github.com/OpenNMS/opennms-compass/commit/13857c3))
* **nodes:** set node geolocation with a button ([7f95d42](https://github.com/OpenNMS/opennms-compass/commit/7f95d42))



<a name="2.0.0-30"></a>
# [2.0.0-30](https://github.com/OpenNMS/opennms-compass/compare/f730bb0...v2.0.0-30) (2015-04-03)


### Bug Fixes

* **dashboard:** sometimes donuts would not render after rotate ([a6d441a](https://github.com/OpenNMS/opennms-compass/commit/a6d441a))
* **ios:** support rotation on iPhone ([f6a4920](https://github.com/OpenNMS/opennms-compass/commit/f6a4920))

### Features

* **dashboard:** clicking server name launches opennms in a browser ([ba4146a](https://github.com/OpenNMS/opennms-compass/commit/ba4146a))
* **info:** add server information to the info popup ([f730bb0](https://github.com/OpenNMS/opennms-compass/commit/f730bb0))

### Performance Improvements

* **build:** minify/ng-annotate on prepare ([5ec1101](https://github.com/OpenNMS/opennms-compass/commit/5ec1101))




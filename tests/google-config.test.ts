import test from 'node:test';
import assert from 'node:assert/strict';
import {googleMapsBrowserConfiguration} from '../src/prospecting/google-config';
import {routePermission} from '../src/lib/access';
test('Google Maps reads only explicit browser keys at runtime, never a server API key',()=>{
 const browser='synthetic_browser_maps_key_12345';
 assert.equal(googleMapsBrowserConfiguration({GOOGLE_MAPS_API_KEY:'private_server_key'}).browserKey,null);
 assert.equal(googleMapsBrowserConfiguration({NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:browser}).browserKey,browser);
 assert.equal(googleMapsBrowserConfiguration({GOOGLE_MAPS_BROWSER_API_KEY:'  '+browser+'  ',NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:'old_build_key'}).browserKey,browser);
 assert.equal(googleMapsBrowserConfiguration({GOOGLE_MAPS_BROWSER_API_KEY:'replace_me'}).configured,false);
 assert.equal(googleMapsBrowserConfiguration({GOOGLE_MAPS_BROWSER_API_KEY:' ',NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:browser}).browserKey,browser);
 assert.equal(googleMapsBrowserConfiguration({}).reason,'MISSING_BROWSER_KEY');
 assert.equal(routePermission('prospecting/map-config','GET'),'map.read');
});

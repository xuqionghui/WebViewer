/*******************************************************************************
#      ____               __          __  _      _____ _       _               #
#     / __ \              \ \        / / | |    / ____| |     | |              #
#    | |  | |_ __   ___ _ __ \  /\  / /__| |__ | |  __| | ___ | |__   ___      #
#    | |  | | '_ \ / _ \ '_ \ \/  \/ / _ \ '_ \| | |_ | |/ _ \| '_ \ / _ \     #
#    | |__| | |_) |  __/ | | \  /\  /  __/ |_) | |__| | | (_) | |_) |  __/     #
#     \____/| .__/ \___|_| |_|\/  \/ \___|_.__/ \_____|_|\___/|_.__/ \___|     #
#           | |                                                                #
#           |_|                 _____ _____  _  __                             #
#                              / ____|  __ \| |/ /                             #
#                             | (___ | |  | | ' /                              #
#                              \___ \| |  | |  <                               #
#                              ____) | |__| | . \                              #
#                             |_____/|_____/|_|\_\                             #
#                                                                              #
#                              (c) 2010-2011 by                                #
#           University of Applied Sciences Northwestern Switzerland            #
#                     Institute of Geomatics Engineering                       #
#                           martin.christen@fhnw.ch                            #
********************************************************************************
*     Licensed under MIT License. Read the file LICENSE for more information   *
*******************************************************************************/

goog.provide('owg.GlobeNavigationNode');

goog.require('goog.events');
goog.require('goog.events.BrowserEvent.MouseButton');
goog.require('goog.events.EventType');
goog.require('goog.events.MouseWheelHandler');
goog.require('owg.GeoCoord');
goog.require('owg.mat4');
goog.require('owg.NavigationNode');
goog.require('owg.ScenegraphNode');
goog.require('owg.vec3');

/**
 * Navigation Node. Setup view matrix using Google Earth-style navigation
 * @author Tom Payne tom.payne@camptocamp.com
 * @author Martin Christen martin.christen@fhnw.ch
 * @constructor
 * @extends NavigationNode
 */
function GlobeNavigationNode()
{
      this.lastkey = 0;
      this.curtime = 0;
      this.matView = new mat4();

      this._vEye = new vec3();
      this._vEye.Set(1,0,0);

      this._yaw = 0;
      this._pitch = -1.570796326794896619231; // -Math.PI/2;
      this._roll = 0;

      this._longitude = 7.7744205094639103;
      this._latitude = 47.472720418012834;
      this._ellipsoidHeight = 10000000;

      this._state = GlobeNavigationNode.STATES.IDLE;
      this._inputs = 0;
      this._dragOriginMouseX = 0;
      this._dragOriginMouseY = 0;
      this._dragOriginYaw = 0;
      this._dragOriginPitch = 0;

      this._fYawSpeed = 0;
      this._fSurfacePitchSpeed = 0;
      this._fRollSpeed = 0;
      this._fPitchSpeed = 0;
      this._fVelocityY = 0;
      this._fSurfacePitch = 0;
      this._fLastRoll = 0;
      this._fSpeed = 1.0;
      this._dFlightVelocity = 1.0;
      this._dYawVelocity = 1.0;
      this._dPitchVelocity = 1.0;
      this._dRollVelocity = 1.0;
      this._dElevationVelocity = 1.0;
      this._pitch_increase = 0;
      this._pitch_decrease = 0;
      this._roll_increase = 0;
      this._roll_decrease = 0;
      this._bRollAnim = false;
      this._MinElevation = 150.0;
      this._dAccumulatedTick = 0;

      this._nMouseX = 0;
      this._nMouseY = 0;
      this._vR = new vec3();
      this._bDragging = false;
      this._dSpeed = 0;

      this.geocoord = new Array(3);
      this.pos = new GeoCoord(0,0,0);

      this.matBody = new mat4();
      this.matTrans = new mat4();
      this.matNavigation = new mat4();
      this.matCami3d = new mat4();
      this.matView = new mat4();
      this.matR1 = new mat4();
      this.matR2 = new mat4();
      this.matCami3d.Cami3d();
      
      this._bHit = false;
      this._bHitLng = 0;
      this._bHitLat = 0;
      this._bHitElv = 0;
      
      // min altitude is currently 100 m, this can be customized in future.
      this.minAltitude = 225;

      //------------------------------------------------------------------------
      this.OnChangeState = function()
      {
         this.engine.SetViewMatrix(this.matView);
      }
      //------------------------------------------------------------------------
      this.OnRender = function()
      {
      }
      //------------------------------------------------------------------------
      this.OnTraverse = function(ts)
      {
         var yaw = this._yaw;
         while (yaw > 2 * Math.PI)
         {
            yaw -= 2* Math.PI;
         }
         while (yaw < 0)
         {
            yaw += 2 * Math.PI;
         }
         var pitch = this._pitch;
         if (pitch < -Math.PI / 2)
         {
            pitch = -Math.PI / 2;
         }
         else if (pitch > Math.PI / 2)
         {
            pitch = Math.PI / 2;
         }

         this.pos.Set(this._longitude, this._latitude, this._ellipsoidHeight);
         this.pos.ToCartesian(this.geocoord);
         this._vEye.Set(this.geocoord[0], this.geocoord[1], this.geocoord[2]);

         this.matTrans.Translation(this.geocoord[0], this.geocoord[1], this.geocoord[2]);
         this.matNavigation.CalcNavigationFrame(this._longitude, this._latitude);
         this.matBody.CalcBodyFrame(yaw, pitch, this._roll);
         this.matR1.Multiply(this.matTrans, this.matNavigation);
         this.matR2.Multiply(this.matR1, this.matBody);
         this.matR1.Multiply(this.matR2, this.matCami3d);
         this.matView.Inverse(this.matR1);


         ts.SetCompassDirection(yaw);
         ts.SetPosition(this.geocoord[0], this.geocoord[1], this.geocoord[2]);
         ts.SetGeoposition(this._longitude, this._latitude, this._ellipsoidHeight);
      }
      //------------------------------------------------------------------------
      this.OnInit = function()
      {
          //
      }
      //------------------------------------------------------------------------
      this.OnExit = function()
      {
         //
      }
      //------------------------------------------------------------------------
      this.OnRegisterEvents = function(context)
      {
         goog.events.listen(window, goog.events.EventType.KEYDOWN, this.OnKeyDown, false, this);
         goog.events.listen(window, goog.events.EventType.KEYUP, this.OnKeyUp, false, this);
         goog.events.listen(context, goog.events.EventType.MOUSEDOWN, this.OnMouseDown, false, this);
         goog.events.listen(context, goog.events.EventType.MOUSEMOVE, this.OnMouseMove, false, this);
         goog.events.listen(context, goog.events.EventType.MOUSEUP, this.OnMouseUp, false, this);
         goog.events.listen(context, goog.events.EventType.DBLCLICK, this.OnMouseDoubleClick, false, this);
         var mouseWheelHandler = new goog.events.MouseWheelHandler(context);
         goog.events.listen(mouseWheelHandler, goog.events.MouseWheelHandler.EventType.MOUSEWHEEL, this.OnMouseWheel, false, this);
      }
      //------------------------------------------------------------------------
      this._OnInputChange = function()
      {
         // Determine the new state based on inputs
         var state = GlobeNavigationNode.STATES.IDLE;
         if ((this._inputs & GlobeNavigationNode.INPUTS.MOUSE_ALL) == GlobeNavigationNode.INPUTS.MOUSE_LEFT)
         {
            if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == 0)
            {
               state = GlobeNavigationNode.STATES.DRAGGING;
            }
            else if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == GlobeNavigationNode.INPUTS.MODIFIER_SHIFT)
            {
               state = GlobeNavigationNode.STATES.ROTATING;
            }
            else if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == GlobeNavigationNode.INPUTS.MODIFIER_CONTROL)
            {
               state = GlobeNavigationNode.STATES.LOOKING;
            }
         }
         // If the state has changed...
         if (state != this._state)
         {
            // ...exit the old state...
            if (this._state == GlobeNavigationNode.STATES.LOOKING)
            {
               this._yaw = this._dragOriginYaw + 45 * Math.PI * this._fSpeed * (this._nMouseX - this._dragOriginMouseX) / (180 * this.engine.height);
               this._pitch = this._dragOriginPitch + 45 * Math.PI * this._fSpeed * (this._dragOriginMouseY - this._nMouseY) / (180 * this.engine.height);
            }
            // ...and enter the new
            this._state = state;
            if (this._state == GlobeNavigationNode.STATES.LOOKING)
            {
               this._dragOriginMouseX = this._nMouseX;
               this._dragOriginMouseY = this._nMouseY;
               this._dragOriginYaw = this._yaw;
               this._dragOriginPitch = this._pitch;
            }
         }
         // Update according to the current state
         if (this._state == GlobeNavigationNode.STATES.LOOKING)
         {
            this._yaw = this._dragOriginYaw + 45 * Math.PI * this._fSpeed * (this._nMouseX - this._dragOriginMouseX) / (180 * this.engine.height);
            this._pitch = this._dragOriginPitch + 45 * Math.PI * this._fSpeed * (this._dragOriginMouseY - this._nMouseY) / (180 * this.engine.height);
         }
      }
      //------------------------------------------------------------------------
      // EVENT: OnMouseWheel
      this.OnMouseWheel = function(e)
      {
         if (this._state == GlobeNavigationNode.STATES.IDLE)
         {
            if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == 0)
            {
               var pickresult = {};
               this.engine.PickEllipsoid(this._nMouseX, this._nMouseY, pickresult);
               if (pickresult["hit"])
               {
                  this.pos.Set(this._longitude, this._latitude, this._ellipsoidHeight);
                  this.pos.ToCartesian(this.geocoord);
                  var dx = this.geocoord[0] - pickresult["x"];
                  var dy = this.geocoord[1] - pickresult["y"];
                  var dz = this.geocoord[2] - pickresult["z"];
                  if (e.deltaY > 0)
                  {
                     dx *= 0.1;
                     dy *= 0.1;
                     dz *= 0.1;
                  }
                  else
                  {
                     dx *= -1 / 0.9 + 1;
                     dy *= -1 / 0.9 + 1;
                     dz *= -1 / 0.9 + 1;
                  }
                  var gc = new GeoCoord(0, 0, 0);
                  gc.FromCartesian(this.geocoord[0] + dx, this.geocoord[1] + dy, this.geocoord[2] + dz);
                  this._longitude = gc._wgscoords[0];
                  this._latitude = gc._wgscoords[1];
                  this._ellipsoidHeight = gc._wgscoords[2];
               }
            }
            else if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == GlobeNavigationNode.INPUTS.MODIFIER_SHIFT)
            {
               this._pitch += 5 * e.deltaY * Math.PI * this._fSpeed / 180;
            }
         }
         
         return this._cancelEvent(e);
      }
      //------------------------------------------------------------------------
      // EVENT: OnKeyDown
      this.OnKeyDown = function(e)
      {
         if (e.keyCode == 16) // 'Shift'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.MODIFIER_SHIFT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 17) // 'Control'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.MODIFIER_CONTROL;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 37 || e.keyCode == 65) // 'LeftArrow' or 'A'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.KEY_LEFT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 38 || e.keyCode == 87) // 'UpArrow' or 'W'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.KEY_UP;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 39 || e.keyCode == 68) // 'RightArrow' or 'D'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.KEY_RIGHT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 40 || e.keyCode == 83) // 'DownArrow' or 'S'
         {
            this._inputs |= GlobeNavigationNode.INPUTS.KEY_DOWN;
            return this._cancelEvent(e);
         }
         this._OnInputChange();
         
         return true;
      }
      //------------------------------------------------------------------------
      // EVENT: OnKeyUp
      this.OnKeyUp = function(e)
      {
         if (e.keyCode == 16) // 'Shift'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.MODIFIER_SHIFT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 17) // 'Control'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.MODIFIER_CONTROL;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 37 || e.keyCode == 65) // 'LeftArrow' or 'A'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.KEY_LEFT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 38 || e.keyCode == 87) // 'UpArrow' or 'W'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.KEY_UP;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 39 || e.keyCode == 68) // 'RightArrow' or 'D'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.KEY_RIGHT;
            return this._cancelEvent(e);
         }
         else if (e.keyCode == 40 || e.keyCode == 83) // 'DownArrow' or 'S'
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.KEY_DOWN;
            return this._cancelEvent(e);
         }
         this._OnInputChange();
         
         return true;
      }
      //------------------------------------------------------------------------
      // EVENT: Double click: fly to position
      this.OnMouseDoubleClick = function(e)
      {
            var pickresult = {};
            this.engine.PickGlobe(this._nMouseX, this._nMouseY, pickresult);
            if (pickresult["hit"])
            {
                  var targetelv = this._ellipsoidHeight;
                  if (targetelv>1000000)
                  {
                        targetelv = 1000000;
                        this.engine.FlyTo(pickresult["lng"],pickresult["lat"],targetelv);
                  }
                  else if (targetelv>250000)
                  {
                        targetelv = 250000;
                        this.engine.FlyTo(pickresult["lng"],pickresult["lat"],targetelv);
                  }
                  else if (targetelv>50000)
                  {
                        targetelv = 50000;
                        this.engine.FlyTo(pickresult["lng"],pickresult["lat"],targetelv);
                  }
                  else
                  {
                        targetelv = pickresult["elv"] + 5000;
                        this.engine.FlyTo(pickresult["lng"],pickresult["lat"],targetelv, 0, -90, 0);
                  }
                  
                  
            }    
         return this._cancelEvent(e);      
      }
      //------------------------------------------------------------------------
      // EVENT: OnMouseDown
      this.OnMouseDown = function(e)
      {
         this._nMouseX = e.offsetX;
         this._nMouseY = e.offsetY;
         if (e.isButton(goog.events.BrowserEvent.MouseButton.LEFT))
         {
            this._inputs |= GlobeNavigationNode.INPUTS.MOUSE_LEFT; 
            document.body.style.cursor='move';
            
         }
         else if (e.isButton(goog.events.BrowserEvent.MouseButton.MIDDLE))
         {
            this._inputs |= GlobeNavigationNode.INPUTS.MOUSE_MIDDLE;
         }
         else if (e.isButton(goog.events.BrowserEvent.MouseButton.RIGHT))
         {
            this._inputs |= GlobeNavigationNode.INPUTS.MOUSE_RIGHT;
            return false;
         }
         this._OnInputChange();
         
         return this._cancelEvent(e);
      }
      //------------------------------------------------------------------------
      // EVENT: OnMouseUp
      this.OnMouseUp = function(e)
      {   
         this._nMouseX = e.offsetX;
         this._nMouseY = e.offsetY;
         if (e.isButton(goog.events.BrowserEvent.MouseButton.LEFT))
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.MOUSE_LEFT;
            this._bHit = false;
            document.body.style.cursor='default';
         }
         else if (e.isButton(goog.events.BrowserEvent.MouseButton.MIDDLE))
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.MOUSE_MIDDLE;
         }
         else if (e.isButton(goog.events.BrowserEvent.MouseButton.RIGHT))
         {
            this._inputs &= ~GlobeNavigationNode.INPUTS.MOUSE_RIGHT;
         }
         this._OnInputChange();
         
         return this._cancelEvent(e);
      }
      //------------------------------------------------------------------------
      // EVENT: OnMouseMove
      this.OnMouseMove = function(e)
      {
         var oldMouseX = this._nMouseX;
         var oldMouseY = this._nMouseY;
         
         this._nMouseX = e.offsetX;
         this._nMouseY = e.offsetY;
         this._OnInputChange();
         
         return this._cancelEvent(e);
      }
      //--------------------------------------------------------------------------
      this.CalcBearing = function(lng1, lat1, lng2, lat2)
      {
        var y = Math.sin(lng2-lng1) * Math.cos(lat2);
        var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lng2-lng1);
        return Math.atan2(y, x);
      }
      //------------------------------------------------------------------------
      // EVENT: OnTick
      this.OnTick = function(dTick)
      {
         if (this._inputs & GlobeNavigationNode.INPUTS.KEY_ALL)
         {
            if ((this._inputs & GlobeNavigationNode.INPUTS.MODIFIER_ALL) == 0)
            {
               var dX = 0;
               if (this._inputs & GlobeNavigationNode.INPUTS.KEY_UP)
               {
                  dX += 1;
               }
               if (this._inputs & GlobeNavigationNode.INPUTS.KEY_DOWN)
               {
                  dX -= 1;
               }
               var dY = 0;
               if (this._inputs & GlobeNavigationNode.INPUTS.KEY_LEFT)
               {
                  dY -= 1;
               }
               if (this._inputs & GlobeNavigationNode.INPUTS.KEY_RIGHT)
               {
                  dY += 1;
               }
               var deltaYaw = Math.atan2(dY, dX);
               var p = (this._ellipsoidHeight / 500000.0) * (this._ellipsoidHeight / 500000.0);
               if (p>10)
               {
                  p=10;
               }
               else if (p<0.001)
               {
                  p=0.001;
               }
               var deltaSurface = p * dTick / 2550;
               // navigate along geodetic line
               var lat_rad = Math.PI * this._latitude / 180; // deg2rad
               var lng_rad = Math.PI * this._longitude / 180; // deg2rad
               var sinlat = Math.sin(lat_rad);
               var coslat = Math.cos(lat_rad);
               var A1 = this._yaw + deltaYaw;
               var B1 = lat_rad;
               var L1 = lng_rad;
               var Rn = WGS84_a / Math.sqrt(1.0 - WGS84_E_SQUARED * sinlat * sinlat);
               var Rm = Rn / (1 + WGS84_E_SQUARED2 * coslat * coslat);
               var deltaB = (WGS84_a / Rm) * deltaSurface * Math.cos(A1);
               var deltaL = (WGS84_a / Rn) * deltaSurface * Math.sin(A1) / Math.cos(B1);
               var A2, B2, L2;
               B2 = deltaB + B1;
               L2 = deltaL + L1;

               this._longitude = 180 * L2 / Math.PI;
               this._latitude = 180 * B2 / Math.PI;

               while (this._longitude > 180)
               {
                  this._longitude -= 180;
               }
               while (this._longitude < -180)
               {
                  this._longitude += 180;
               }
               while (this._latitude > 90)
               {
                  this._latitude -= 180;
               }
               while (this._latitude < -90)
               {
                  this._latitude += 180;
               }
            }
         }
         
         //---------------------------------------------------------------------
         // DRAG
         
         if (this._state == GlobeNavigationNode.STATES.DRAGGING)
         {
            if (this._bHit)
            {
               var lng0 = this._bHitLng;
               var lat0 = this._bHitLat;
               var oldElv = this._bHitElv;
               
               var pickresult = {};
               this.engine.PickEllipsoid(this._nMouseX, this._nMouseY, pickresult);
               if (pickresult["hit"])
               {                  
                  var lng1 = Math.PI*pickresult["lng"]/180; // just to make it a little bit more readable..
                  var lat1 = Math.PI*pickresult["lat"]/180;
                  
                  if (Math.abs(lng1-lng0)>0 ||
                      Math.abs(lat1-lat0)>0)
                  {
                        this._bHitLng = lng1;
                        this._bHitLat = lat1;
                        this._bHitElv = Math.PI*pickresult["elv"]/180;
                        this._bHit = true;
                        
                        var azi = this.CalcBearing(lng0, lat0, lng1, lat1);
                  
                        // calculate length from last to new position
                        var coss = Math.sin(lat0)*Math.sin(lat1)+Math.cos(lat1)*Math.cos(lat0)*Math.cos(lng0-lng1);
                        var s = Math.acos(coss)* WGS84_a_scaled;
                           
                        //var s = 0.006;
                        var lat_rad = Math.PI * this._latitude / 180; // deg2rad
                        var lng_rad = Math.PI * this._longitude / 180; // deg2rad
                        var sinlat = Math.sin(lat_rad);
                        var coslat = Math.cos(lat_rad);
                        var A1 = azi+Math.PI;
                        var B1 = lat_rad;
                        var L1 = lng_rad;
                        var Rn = WGS84_a / Math.sqrt(1.0 - WGS84_E_SQUARED * sinlat * sinlat);
                        var Rm = Rn / (1 + WGS84_E_SQUARED2 * coslat * coslat);
                        var deltaB = (WGS84_a / Rm) * s * Math.cos(A1);
                        var deltaL = (WGS84_a / Rn) * s * Math.sin(A1) / Math.cos(B1);
                        var A2, B2, L2;
                        B2 = deltaB + B1;
                        L2 = deltaL + L1;
                        
                        /*console.log("Delta");
                        console.log(B2);
                        console.log(L2);*/
         
                        this._longitude = 180 * L2 / Math.PI;
                        this._latitude = 180 * B2 / Math.PI;
                        
                        while (this._longitude > 180)
                        {
                           this._longitude -= 180;
                        }
                        while (this._longitude < -180)
                        {
                           this._longitude += 180;
                        }
                        while (this._latitude > 90)
                        {
                           this._latitude -= 180;
                        }
                        while (this._latitude < -90)
                        {
                           this._latitude += 180;
                        }
                  }
               }
               else
               {
                  this._bHit = false;      
               }
            }
            else
            {
               var pickresult = {};
               this.engine.PickEllipsoid(this._nMouseX, this._nMouseY, pickresult);
               if (pickresult["hit"])
               {
                  this._bHit = true;
                  this._bHitLng = Math.PI*pickresult["lng"]/180;
                  this._bHitLat = Math.PI*pickresult["lat"]/180;
                  this._bHitElv = Math.PI*pickresult["elv"]/180;
               }
            }
         }
         
      }
      // Cancel Event
      this._cancelEvent = function(evt)
      {
         evt = evt ? evt : window.event;
         if(evt.stopPropagation)
            evt.stopPropagation();
         if(evt.preventDefault)
            evt.preventDefault();
         evt.cancelBubble = true;
         evt.cancel = true;
         evt.returnValue = false;
         return false;
      }
}
goog.inherits(GlobeNavigationNode, NavigationNode);


/** @enum {number} */
GlobeNavigationNode.INPUTS = {
   MOUSE_LEFT: 0x01,
   MOUSE_MIDDLE: 0x02,
   MOUSE_RIGHT: 0x04,
   MOUSE_ALL: 0x07,
   KEY_LEFT: 0x10,
   KEY_UP: 0x20,
   KEY_RIGHT: 0x40,
   KEY_DOWN: 0x80,
   KEY_ALL: 0xf0,
   MODIFIER_SHIFT: 0x100,
   MODIFIER_CONTROL: 0x200,
   MODIFIER_ALL: 0x300
};

/** @enum {number} */
GlobeNavigationNode.STATES = {
   IDLE: 0,
   DRAGGING: 1,
   LOOKING: 2,
   ROTATING: 3,
   PANNING: 4,
   PITCHING: 5,
   ZOOMING: 6
};

package com.yourapp.navigation

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import android.content.Intent

class NavigationModule(private val ctx: ReactApplicationContext): ReactContextBaseJavaModule(ctx) {
  override fun getName(): String = "NavigationModule"

  @ReactMethod
  fun startNavigation(params: ReadableMap) {
    val origin = params.getMap("origin")
    val dest = params.getMap("destination")
    val waypoints = params.getArray("waypoints")
    val title = if (params.hasKey("title")) params.getString("title") else "Trip"

    val i = Intent(currentActivity, NavActivity::class.java)
    if (origin != null) {
      i.putExtra("oLat", origin.getDouble("lat"))
      i.putExtra("oLng", origin.getDouble("lng"))
    }
    if (dest != null) {
      i.putExtra("dLat", dest.getDouble("lat"))
      i.putExtra("dLng", dest.getDouble("lng"))
    }
    i.putExtra("title", title)
    currentActivity?.startActivity(i)
  }
}


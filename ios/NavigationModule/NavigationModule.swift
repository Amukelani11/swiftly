import Foundation
import React
import GoogleNavigation
import CoreLocation

@objc(NavigationModule)
class NavigationModule: NSObject, RCTBridgeModule {

    static func moduleName() -> String! {
        return "NavigationModule"
    }

    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    private var navViewController: NavViewController?

    @objc func startNavigation(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                guard let origin = params["origin"] as? NSDictionary,
                      let destination = params["destination"] as? NSDictionary,
                      let originLat = origin["lat"] as? Double,
                      let originLng = origin["lng"] as? Double,
                      let destLat = destination["lat"] as? Double,
                      let destLng = destination["lng"] as? Double else {
                    reject("INVALID_PARAMS", "Origin and destination coordinates are required", nil)
                    return
                }

                let title = params["title"] as? String ?? "Trip Navigation"

                // Create navigation waypoints
                let originWaypoint = GMSNavigationMutableWaypoint(
                    location: CLLocationCoordinate2D(latitude: originLat, longitude: originLng),
                    title: "Start"
                )

                let destinationWaypoint = GMSNavigationMutableWaypoint(
                    location: CLLocationCoordinate2D(latitude: destLat, longitude: destLng),
                    title: title
                )

                // Add intermediate waypoints if provided
                var waypoints: [GMSNavigationWaypoint] = []
                if let waypointsArray = params["waypoints"] as? [NSDictionary] {
                    for waypointDict in waypointsArray {
                        if let wpLat = waypointDict["lat"] as? Double,
                           let wpLng = waypointDict["lng"] as? Double {
                            let waypoint = GMSNavigationMutableWaypoint(
                                location: CLLocationCoordinate2D(latitude: wpLat, longitude: wpLng),
                                title: "Stop"
                            )
                            waypoints.append(waypoint)
                        }
                    }
                }

                // Create navigation view controller
                self.navViewController = NavViewController()
                self.navViewController?.origin = originWaypoint
                self.navViewController?.destination = destinationWaypoint
                self.navViewController?.waypoints = waypoints

                // Present the navigation view controller
                if let rootVC = UIApplication.shared.keyWindow?.rootViewController {
                    rootVC.present(self.navViewController!, animated: true) {
                        // Start navigation guidance
                        self.navViewController?.startNavigation()
                        resolve("Navigation started successfully")
                    }
                } else {
                    reject("NO_ROOT_VIEW_CONTROLLER", "Unable to find root view controller", nil)
                }

            } catch {
                reject("NAVIGATION_ERROR", error.localizedDescription, nil)
            }
        }
    }
}

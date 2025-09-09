import UIKit
import GoogleNavigation
import CoreLocation

class NavViewController: UIViewController, GMSNavigatorListener {

    var origin: GMSNavigationWaypoint?
    var destination: GMSNavigationWaypoint?
    var waypoints: [GMSNavigationWaypoint] = []

    private var navigator: GMSNavigator?
    private var navView: GMSNavigationView?

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set up navigation view
        navView = GMSNavigationView(frame: view.bounds)
        navView?.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        navView?.settings.showsSpeedometer = true
        navView?.settings.showsSpeedLimit = true
        navView?.settings.showsTrafficLights = true
        view.addSubview(navView!)

        // Get navigator instance
        navigator = GMSNavigator.sharedInstance
        navigator?.add(self)

        // Request location permission if needed
        requestLocationPermission()
    }

    func startNavigation() {
        guard let origin = origin, let destination = destination else {
            print("Navigation: Missing origin or destination")
            return
        }

        do {
            // Set destination with waypoints
            try navigator?.setDestination(destination, waypoints: waypoints)

            // Start guidance
            navigator?.isGuidanceEnabled = true

            print("Navigation: Started guidance to destination")

        } catch {
            print("Navigation: Error starting guidance - \(error.localizedDescription)")
        }
    }

    private func requestLocationPermission() {
        let locationManager = CLLocationManager()
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestAlwaysAuthorization()
    }

    // MARK: - GMSNavigatorListener

    func navigator(_ navigator: GMSNavigator, didUpdate position: GMSNavigationPosition) {
        // Position updates - you can use this for custom UI updates if needed
        print("Navigation: Position updated - \(position.coordinate)")
    }

    func navigator(_ navigator: GMSNavigator, didUpdate route: GMSNavigationRoute?) {
        // Route updates
        print("Navigation: Route updated")
    }

    func navigator(_ navigator: GMSNavigator, didUpdateRemaining distance: CLLocationDistance, time: TimeInterval) {
        // Remaining distance and time updates
        print("Navigation: Remaining distance: \(distance)m, time: \(time)s")
    }

    func navigator(_ navigator: GMSNavigator, didUpdate guidanceState: GMSNavigationGuidanceState) {
        // Guidance state changes
        print("Navigation: Guidance state changed to \(guidanceState)")
    }

    // MARK: - UI Controls

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        navView?.frame = view.bounds
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }

    override var prefersStatusBarHidden: Bool {
        return false
    }
}

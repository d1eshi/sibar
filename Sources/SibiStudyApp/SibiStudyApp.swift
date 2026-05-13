import SibiStudyShellKit
import SwiftUI

@main
struct SibiStudyApp: App {
    @NSApplicationDelegateAdaptor(SibiStudyAppDelegate.self) private var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

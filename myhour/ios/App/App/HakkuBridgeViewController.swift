import UIKit
import Capacitor

/// 하꾸 앱 화면. 앱 안에만 있는 플러그인(인스타 릴스 공유)을 여기서 등록한다.
class HakkuBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InstagramSharePlugin())
    }
}

/// 하꾸 영상을 담은 채로 인스타그램 릴스 편집 화면을 연다 (Meta 공식 "Sharing to Reels").
/// 영상은 대지(UIPasteboard)에 5분 동안만 올려 두고, Facebook 앱 ID로 출처를 밝힌다.
@objc(InstagramSharePlugin)
public class InstagramSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramSharePlugin"
    public let jsName = "InstagramShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareToReels", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareToReels(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let fileURL = URL(string: path),
              let appId = call.getString("appId"), !appId.isEmpty,
              let shareURL = URL(string: "instagram-reels://share?source_application=\(appId)") else {
            call.reject("공유할 영상을 찾지 못했어요.", "invalid_arguments")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.canOpenURL(shareURL) else {
                call.reject("인스타그램 앱이 없어요.", "instagram_not_installed")
                return
            }
            guard let data = try? Data(contentsOf: fileURL) else {
                call.reject("공유할 영상을 읽지 못했어요.", "file_unreadable")
                return
            }
            UIPasteboard.general.setItems(
                [["com.instagram.sharedSticker.backgroundVideo": data]],
                options: [.expirationDate: Date().addingTimeInterval(5 * 60)]
            )
            UIApplication.shared.open(shareURL) { opened in
                if opened { call.resolve() } else { call.reject("인스타그램을 열지 못했어요.", "instagram_open_failed") }
            }
        }
    }
}

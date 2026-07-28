package tech.mmocc.xiboplayer

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Thin kiosk shell - identical role to the Windows Electron shell. All real
 * player logic (registration, QR, polling, heartbeat) lives in the shared
 * /player web page; this just hosts it fullscreen with no browser chrome.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true // localStorage persists the device identity/tokens
        webView.settings.databaseEnabled = true
        webView.webViewClient = WebViewClient()
        setContentView(webView)

        webView.loadUrl("${BuildConfig.PLAYER_BASE_URL}/player")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    private fun hideSystemUi() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    // A dedicated kiosk screen has nothing to navigate back to.
    @Suppress("OVERRIDE_DEPRECATION", "MissingSuperCall")
    override fun onBackPressed() {
        // no-op - swallow the back button rather than exiting the app
    }
}

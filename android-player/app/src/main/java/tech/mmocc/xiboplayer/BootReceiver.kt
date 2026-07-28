package tech.mmocc.xiboplayer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Relaunches the player automatically after a power cycle - these boxes run unattended. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val launchIntent = Intent(context, MainActivity::class.java)
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
        }
    }
}

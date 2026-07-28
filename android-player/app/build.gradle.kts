plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "tech.mmocc.xiboplayer"
    compileSdk = 34

    defaultConfig {
        applicationId = "tech.mmocc.xiboplayer"
        minSdk = 21 // covers effectively all Android TV boxes in the field
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        val playerBaseUrl = (project.findProperty("PLAYER_BASE_URL") as String?)
            ?: "https://your-cms-domain.example.com"
        buildConfigField("String", "PLAYER_BASE_URL", "\"$playerBaseUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}

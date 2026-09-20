plugins {
    id("com.android.application")
}

android {
    namespace = "it.liveasta.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "it.liveasta.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

package it.liveasta.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String HOME = "https://www.liveasta.it/";
    private WebView webView;
    private volatile String currentPage = "";
    private ValueCallback<Uri[]> selectedFiles;
    private static final int PICK_FILE = 10;

    private static boolean isLiveAsta(Uri uri) {
        String host = uri.getHost();
        return "https".equalsIgnoreCase(uri.getScheme()) && host != null &&
            (host.equalsIgnoreCase("www.liveasta.it") || host.equalsIgnoreCase("liveasta.it"));
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void saveCsv(String name, String data) {
                if (data.length() > 16_000_000 || !isLiveAsta(Uri.parse(currentPage))) return;
                String safe = name.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (safe.isEmpty()) safe = "liveasta.csv";
                try {
                    byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    values.put(MediaStore.Downloads.MIME_TYPE, "text/csv");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("Download non disponibile");
                    try (OutputStream output = getContentResolver().openOutputStream(uri)) { output.write(bytes); }
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "File salvato in Download", Toast.LENGTH_SHORT).show());
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Impossibile salvare il file", Toast.LENGTH_SHORT).show());
                }
            }
        }, "LiveAstaAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLiveAsta(uri)) return false;
                if (request.isForMainFrame()) { openExternal(uri); return true; }
                return false;
            }
            @Override public void onPageFinished(WebView view, String url) {
                currentPage = url;
                if (!isLiveAsta(Uri.parse(url))) return;
                view.evaluateJavascript("document.addEventListener('click',function(e){var a=e.target.closest('a[download]');if(!a||!a.href.startsWith('blob:'))return;e.preventDefault();fetch(a.href).then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();fr.onload=function(){LiveAstaAndroid.saveCsv(a.download||'liveasta.csv',String(fr.result).split(',')[1])};fr.readAsDataURL(b)}).catch(function(){alert('Download non riuscito')})},true)", null);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if (selectedFiles != null) selectedFiles.onReceiveValue(null);
                selectedFiles = callback;
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    selectedFiles = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Nessun gestore file disponibile", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture,
                                                    Message resultMsg) {
                if (!isUserGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                        openExternal(request.getUrl());
                        child.destroy();
                        return true;
                    }
                });
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });
        webView.setDownloadListener((url, agent, disposition, mime, length) -> {
            if (!url.startsWith("https://")) {
                Toast.makeText(this, "Download non disponibile: apri la PWA nel browser", Toast.LENGTH_LONG).show();
                return;
            }
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mime);
            request.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) == null ? "" : CookieManager.getInstance().getCookie(url));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                android.webkit.URLUtil.guessFileName(url, disposition, mime));
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
        });
        webView.loadUrl(HOME);
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Nessuna app disponibile per aprire il link", Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_FILE && selectedFiles != null) {
            selectedFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            selectedFiles = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (selectedFiles != null) { selectedFiles.onReceiveValue(null); selectedFiles = null; }
        webView.destroy();
        super.onDestroy();
    }
}

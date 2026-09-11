package su.vizhu.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "VizhuInsets";

    /** Последние известные отступы в CSS-пикселях — переставляем их после перезагрузки страницы. */
    private float lastTop = 0f;
    private float lastRight = 0f;
    private float lastBottom = 0f;
    private float lastLeft = 0f;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        listenToWindowInsets();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Слушатель мог отработать раньше, чем появился документ SPA: тогда
        // переменные выставились в пустой странице и потерялись при загрузке.
        // Просим систему прислать отступы ещё раз, когда WebView уже с контентом.
        final WebView webView = getBridge().getWebView();
        webView.postDelayed(() -> ViewCompat.requestApplyInsets(webView), 300);
    }

    /**
     * Прокидывает системные отступы (статус-бар, панель жестов, вырез экрана)
     * в CSS-переменные `--inset-*` на элементе `<html>`.
     *
     * Зачем: CSS-функция `env(safe-area-inset-*)` в Android WebView для
     * системных панелей всегда возвращает 0 — она рассчитана на вырез экрана
     * в браузере, а не на инсеты окна. При этом с targetSdk 35+ Android рисует
     * приложение под системными панелями принудительно, то есть 100dvh включает
     * полосу жестов. Без этого моста нижняя часть интерфейса (таб-бар) уезжает
     * под панель и вёрстке не хватает её высоты.
     *
     * На web и iOS переменные не выставляются, и CSS откатывается на `env()` —
     * там оно работает как надо (см. `--inset-*` в app/index.css).
     */
    private void listenToWindowInsets() {
        final WebView webView = getBridge().getWebView();

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;

            lastTop = insets.top / density;
            lastRight = insets.right / density;
            lastBottom = insets.bottom / density;
            lastLeft = insets.left / density;

            Log.i(TAG, String.format(
                Locale.US,
                "отступы (css px): top=%.1f right=%.1f bottom=%.1f left=%.1f",
                lastTop, lastRight, lastBottom, lastLeft
            ));

            applyInsetsToPage(webView);
            // Отступы не «съедаем»: они могут понадобиться другим вьюхам.
            return windowInsets;
        });

        ViewCompat.requestApplyInsets(webView);
    }

    private void applyInsetsToPage(WebView webView) {
        String js = String.format(
            Locale.US,
            "(function(){var s=document.documentElement&&document.documentElement.style;if(!s)return;"
                + "s.setProperty('--inset-top','%.2fpx');"
                + "s.setProperty('--inset-right','%.2fpx');"
                + "s.setProperty('--inset-bottom','%.2fpx');"
                + "s.setProperty('--inset-left','%.2fpx');})()",
            lastTop, lastRight, lastBottom, lastLeft
        );
        webView.evaluateJavascript(js, null);
    }
}

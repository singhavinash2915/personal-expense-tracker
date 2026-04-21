package com.avinash.expenseflow;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Home-screen widget that displays ExpenseFlow balance & today's spend.
 * Reads snapshot JSON written by the web app via Capacitor Preferences.
 */
public class ExpenseFlowWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.expenseflow_widget);

        // Capacitor Preferences stores values in "CapacitorStorage" SharedPreferences.
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String json = prefs.getString("ef_widget_snapshot", null);

        if (json != null) {
            try {
                JSONObject snap = new JSONObject(json);
                views.setTextViewText(R.id.widget_balance, snap.optString("balanceFormatted", "—"));
                views.setTextViewText(R.id.widget_net_worth, "Net: " + snap.optString("netWorthFormatted", "—"));
                String todaySpend = snap.optString("todayExpenseFormatted", "₹0");
                views.setTextViewText(R.id.widget_today, "Today: −" + todaySpend);
                views.setTextViewText(R.id.widget_month_income, snap.optString("incomeFormatted", "—"));
                views.setTextViewText(R.id.widget_month_expense, snap.optString("expensesFormatted", "—"));
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_balance, "—");
            }
        } else {
            views.setTextViewText(R.id.widget_balance, "Open app to sync");
        }

        // Tap widget → open main activity
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

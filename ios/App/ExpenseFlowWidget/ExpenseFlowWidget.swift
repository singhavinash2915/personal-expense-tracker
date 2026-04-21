//
//  ExpenseFlowWidget.swift
//  ExpenseFlowWidget
//
//  Home-screen widget showing balance + today's spend.
//  Reads snapshot data from App Group UserDefaults written by the web app.
//

import WidgetKit
import SwiftUI

// MARK: - Data Model

struct ExpenseSnapshot {
    let balance: String
    let netWorth: String
    let income: String
    let expenses: String
    let todayExpense: String
    let updatedAt: Date

    static let placeholder = ExpenseSnapshot(
        balance: "₹—",
        netWorth: "—",
        income: "—",
        expenses: "—",
        todayExpense: "₹0",
        updatedAt: Date()
    )

    static func load() -> ExpenseSnapshot {
        // IMPORTANT: Replace "group.com.avinash.expenseflow" with your actual
        // App Group identifier (set in BOTH the main app target and widget extension's
        // "Signing & Capabilities" → App Groups).
        guard let defaults = UserDefaults(suiteName: "group.com.avinash.expenseflow"),
              let json = defaults.string(forKey: "ef_widget_snapshot"),
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return .placeholder
        }
        return ExpenseSnapshot(
            balance:      obj["balanceFormatted"]      as? String ?? "—",
            netWorth:     obj["netWorthFormatted"]     as? String ?? "—",
            income:       obj["incomeFormatted"]       as? String ?? "—",
            expenses:     obj["expensesFormatted"]     as? String ?? "—",
            todayExpense: obj["todayExpenseFormatted"] as? String ?? "₹0",
            updatedAt: Date()
        )
    }
}

// MARK: - Timeline Provider

struct ExpenseFlowProvider: TimelineProvider {
    func placeholder(in context: Context) -> ExpenseEntry {
        ExpenseEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ExpenseEntry) -> Void) {
        completion(ExpenseEntry(date: Date(), snapshot: ExpenseSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ExpenseEntry>) -> Void) {
        let entry = ExpenseEntry(date: Date(), snapshot: ExpenseSnapshot.load())
        // Refresh every 30 minutes
        let refresh = Date().addingTimeInterval(30 * 60)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct ExpenseEntry: TimelineEntry {
    let date: Date
    let snapshot: ExpenseSnapshot
}

// MARK: - Widget Views

struct ExpenseFlowWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: ExpenseFlowProvider.Entry

    var body: some View {
        switch family {
        case .systemSmall:  SmallView(snap: entry.snapshot)
        case .systemMedium: MediumView(snap: entry.snapshot)
        default:            SmallView(snap: entry.snapshot)
        }
    }
}

struct SmallView: View {
    let snap: ExpenseSnapshot
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.01, green: 0.07, blue: 0.05),    // #03110d
                         Color(red: 0.04, green: 0.12, blue: 0.08),    // #0A1F14
                         Color(red: 0.10, green: 0.23, blue: 0.16)],   // #1A3A29
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("ExpenseFlow")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14))  // #FBBF24 gold
                        .textCase(.uppercase)
                    Spacer()
                    Text("💰").font(.system(size: 12))
                }
                Text(snap.balance)
                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text("Balance")
                    .font(.system(size: 9))
                    .foregroundColor(Color(red: 0.58, green: 0.64, blue: 0.72))
                Spacer()
                Text("Today: −" + snap.todayExpense)
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0.99, green: 0.65, blue: 0.68))
                Text("Net: " + snap.netWorth)
                    .font(.system(size: 9))
                    .foregroundColor(Color(red: 0.77, green: 0.71, blue: 0.99))
                    .lineLimit(1)
            }
            .padding(12)
        }
    }
}

struct MediumView: View {
    let snap: ExpenseSnapshot
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.01, green: 0.07, blue: 0.05),    // #03110d
                         Color(red: 0.04, green: 0.12, blue: 0.08),    // #0A1F14
                         Color(red: 0.10, green: 0.23, blue: 0.16)],   // #1A3A29
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("ExpenseFlow")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14))  // #FBBF24 gold
                        .textCase(.uppercase)
                    Spacer()
                    Text("💰").font(.system(size: 14))
                }
                Text(snap.balance)
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text("Balance")
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0.58, green: 0.64, blue: 0.72))
                HStack(spacing: 10) {
                    StatBlock(label: "INCOME",  value: snap.income,   tint: Color(red: 0.20, green: 0.83, blue: 0.60))
                    StatBlock(label: "SPENT",   value: snap.expenses, tint: Color(red: 0.97, green: 0.44, blue: 0.44))
                    StatBlock(label: "TODAY",   value: snap.todayExpense, tint: Color(red: 0.99, green: 0.65, blue: 0.68))
                }
            }
            .padding(14)
        }
    }
}

struct StatBlock: View {
    let label: String
    let value: String
    let tint: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(tint.opacity(0.7))
            Text(value)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 5).padding(.horizontal, 7)
        .background(Color.white.opacity(0.08))
        .cornerRadius(6)
    }
}

// MARK: - Widget

@main
struct ExpenseFlowWidget: Widget {
    let kind: String = "ExpenseFlowWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ExpenseFlowProvider()) { entry in
            ExpenseFlowWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("ExpenseFlow")
        .description("Your balance & today's spending at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

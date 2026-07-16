import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';

dotenv.config();

// We use process.cwd() so that data files are stored at the root of the project, 
// outside the 'dist' folder. This prevents Vite's build process from deleting the SQLite database.
const rootDir = process.cwd();

const DATA_FILE = path.join(rootDir, 'zara_database.json');
const MESSAGES_FILE = path.join(rootDir, 'zara_messages.json');

// We allow customized SQLite database path via environment variables to prevent deletion during container/local deployments.
// Example: SQLITE_DB_PATH=/var/lib/zara/zara_database.sqlite
let SQLITE_DB_FILE = process.env.SQLITE_DB_PATH;

if (!SQLITE_DB_FILE) {
  // Fallbacks: If /app_data exists (e.g. Docker Volume is mounted), we write the database file there.
  // Otherwise, fallback to the project's root folder.
  if (fsSync.existsSync('/app_data')) {
    SQLITE_DB_FILE = path.join('/app_data', 'zara_database.sqlite');
  } else {
    SQLITE_DB_FILE = path.join(rootDir, 'zara_database.sqlite');
  }
} else {
  // Ensure the parent directory of the custom database path exists!
  const parentFolder = path.dirname(SQLITE_DB_FILE);
  try {
    if (!fsSync.existsSync(parentFolder)) {
      fsSync.mkdirSync(parentFolder, { recursive: true });
    }
  } catch (err) {
    console.error(`Failed to create parent folder for custom SQLite path: ${parentFolder}`, err);
  }
}

// Ensure complete structured database sync engine
async function syncAllStateToIndividualTables(parsed: any, isMariaDB: boolean, poolOrDb: any) {
  try {
    if (!parsed) return;

    // Optional Structured Sync Bypassing by Administrator
    if (parsed.settings && parsed.settings.isDatabaseSyncEnabled === false) {
      return;
    }

    if (isMariaDB) {
      // 1. Sync USERS
      if (parsed.users && Array.isArray(parsed.users)) {
        for (const user of parsed.users) {
          await poolOrDb.query(`
            INSERT INTO users (id, name, pin, role, is_active, avatar, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              pin = VALUES(pin),
              role = VALUES(role),
              is_active = VALUES(is_active),
              avatar = VALUES(avatar),
              permissions = VALUES(permissions)
          `, [
            user.id,
            user.name || '',
            user.pin || '',
            user.role || 'CAISSIER',
            user.isActive !== false ? 1 : 0,
            user.avatar || null,
            user.permissions ? JSON.stringify(user.permissions) : null
          ]);
        }
      }

      // 2. Sync PRODUCTS and product variants
      if (parsed.products && Array.isArray(parsed.products)) {
        for (const prod of parsed.products) {
          await poolOrDb.query(`
            INSERT INTO products (id, name, category, sub_category, base_price, min_stock_threshold, image_url, image_color, wholesale_price, wholesale_min_qty, bulk_pack_qty, is_wholesale_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              category = VALUES(category),
              sub_category = VALUES(sub_category),
              base_price = VALUES(base_price),
              min_stock_threshold = VALUES(min_stock_threshold),
              image_url = VALUES(image_url),
              image_color = VALUES(image_color),
              wholesale_price = VALUES(wholesale_price),
              wholesale_min_qty = VALUES(wholesale_min_qty),
              bulk_pack_qty = VALUES(bulk_pack_qty),
              is_wholesale_enabled = VALUES(is_wholesale_enabled)
          `, [
            prod.id,
            prod.name || '',
            prod.category || '',
            prod.subCategory || null,
            prod.basePrice || 0,
            prod.minStockThreshold || 0,
            prod.imageUrl || null,
            prod.imageColor || '',
            prod.wholesalePrice || null,
            prod.wholesaleMinQty || null,
            prod.bulkPackQty || null,
            prod.isWholesaleEnabled ? 1 : 0
          ]);

          if (prod.variants && Array.isArray(prod.variants)) {
            for (const v of prod.variants) {
              await poolOrDb.query(`
                INSERT INTO product_variants (id, product_id, size, color, stock, barcode)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  product_id = VALUES(product_id),
                  size = VALUES(size),
                  color = VALUES(color),
                  stock = VALUES(stock),
                  barcode = VALUES(barcode)
              `, [
                v.id || `${prod.id}-${v.size}-${v.color}`,
                prod.id,
                v.size || '',
                v.color || '',
                v.stock || 0,
                v.barcode || null
              ]);
            }
          }
        }
      }

      // 3. Sync ORDERS with items and payments
      if (parsed.orders && Array.isArray(parsed.orders)) {
        for (const order of parsed.orders) {
          const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
          const customerId = order.customer?.id || null;
          await poolOrDb.query(`
            INSERT INTO orders (id, date, cashier, customer_id, subtotal, tax, discount_total, total, status, amount_paid, original_order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              date = VALUES(date),
              cashier = VALUES(cashier),
              customer_id = VALUES(customer_id),
              subtotal = VALUES(subtotal),
              tax = VALUES(tax),
              discount_total = VALUES(discount_total),
              total = VALUES(total),
              status = VALUES(status),
              amount_paid = VALUES(amount_paid),
              original_order_id = VALUES(original_order_id)
          `, [
            order.id,
            orderDate,
            order.cashier || '',
            customerId,
            order.subtotal || 0,
            order.tax || 0,
            order.discountTotal || 0,
            order.total || 0,
            order.status || 'COMPLETED',
            order.amountPaid || order.total || 0,
            order.originalOrderId || null
          ]);

          if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
              await poolOrDb.query(`
                INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, discount, manual_price, manual_price_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  order_id = VALUES(order_id),
                  product_id = VALUES(product_id),
                  variant_id = VALUES(variant_id),
                  quantity = VALUES(quantity),
                  discount = VALUES(discount),
                  manual_price = VALUES(manual_price),
                  manual_price_reason = VALUES(manual_price_reason)
              `, [
                item.id || `${order.id}-${item.product?.id}-${item.variant?.id}`,
                order.id,
                item.product?.id,
                item.variant?.id,
                item.quantity || 1,
                item.discount || 0,
                item.manualPrice || null,
                item.manualPriceReason || null
              ]);
            }
          }

          if (order.payments && Array.isArray(order.payments)) {
            for (const p of order.payments) {
              await poolOrDb.query(`
                INSERT INTO order_payments (id, order_id, method, amount)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  order_id = VALUES(order_id),
                  method = VALUES(method),
                  amount = VALUES(amount)
              `, [
                `${order.id}-${p.method}`,
                order.id,
                p.method,
                p.amount
              ]);
            }
          }
        }
      }

      // 4. Sync CASH_MOVEMENTS
      if (parsed.cashMovements && Array.isArray(parsed.cashMovements)) {
        for (const mv of parsed.cashMovements) {
          await poolOrDb.query(`
            INSERT INTO cash_movements (id, type, amount, reason, date, user)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              type = VALUES(type),
              amount = VALUES(amount),
              reason = VALUES(reason),
              date = VALUES(date),
              user = VALUES(user)
          `, [mv.id, mv.type, mv.amount, mv.reason || '', mv.date, mv.user]);
        }
      }

      // 5. Sync STOCK_MOVEMENTS
      if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) {
        for (const mv of parsed.stockMovements) {
          await poolOrDb.query(`
            INSERT INTO stock_movements (id, product_id, variant_id, type, quantity, reason, date, user)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              product_id = VALUES(product_id),
              variant_id = VALUES(variant_id),
              type = VALUES(type),
              quantity = VALUES(quantity),
              reason = VALUES(reason),
              date = VALUES(date),
              user = VALUES(user)
          `, [mv.id, mv.productId, mv.variantId, mv.type, mv.quantity, mv.reason || '', mv.date, mv.user]);
        }
      }

      // 6. Sync AUDIT_LOGS
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        for (const log of parsed.auditLogs) {
          await poolOrDb.query(`
            INSERT INTO audit_logs (id, timestamp, user, action, details, severity)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              timestamp = VALUES(timestamp),
              user = VALUES(user),
              action = VALUES(action),
              details = VALUES(details),
              severity = VALUES(severity)
          `, [log.id, log.timestamp, log.user, log.action, log.details || '', log.severity]);
        }
      }

      // 7. Sync CUSTOMERS
      if (parsed.customers && Array.isArray(parsed.customers)) {
        for (const cust of parsed.customers) {
          await poolOrDb.query(`
            INSERT INTO customers (id, name, phone, loyalty_points, total_spent, last_purchase_date, suspended)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              phone = VALUES(phone),
              loyalty_points = VALUES(loyalty_points),
              total_spent = VALUES(total_spent),
              last_purchase_date = VALUES(last_purchase_date),
              suspended = VALUES(suspended)
          `, [
            cust.id,
            cust.name || '',
            cust.phone || '',
            cust.loyaltyPoints || 0,
            cust.totalSpent || 0,
            cust.lastPurchaseDate || null,
            cust.suspended ? 1 : 0
          ]);
        }
      }

      // 8. Sync PROMOTIONS
      if (parsed.promotions && Array.isArray(parsed.promotions)) {
        for (const promo of parsed.promotions) {
          await poolOrDb.query(`
            INSERT INTO promotions (id, title, image_url, is_active, type, discount_value)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              title = VALUES(title),
              image_url = VALUES(image_url),
              is_active = VALUES(is_active),
              type = VALUES(type),
              discount_value = VALUES(discount_value)
          `, [
            promo.id,
            promo.title || '',
            promo.imageUrl || '',
            promo.isActive ? 1 : 0,
            promo.type || 'BANNER',
            promo.discountValue || null
          ]);
        }
      }

      // 9. Sync PENDING_TICKETS
      if (parsed.pendingTickets && Array.isArray(parsed.pendingTickets)) {
        for (const ticket of parsed.pendingTickets) {
          await poolOrDb.query(`
            INSERT INTO pending_tickets (id, name, timestamp, items)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              timestamp = VALUES(timestamp),
              items = VALUES(items)
          `, [ticket.id, ticket.name || '', ticket.timestamp, JSON.stringify(ticket.items)]);
        }
      }

      // 10. Sync WHOLESALERS
      if (parsed.wholesalers && Array.isArray(parsed.wholesalers)) {
        for (const w of parsed.wholesalers) {
          await poolOrDb.query(`
            INSERT INTO wholesalers (id, name, phone, email, address, company_name, pending_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              phone = VALUES(phone),
              email = VALUES(email),
              address = VALUES(address),
              company_name = VALUES(company_name),
              pending_balance = VALUES(pending_balance)
          `, [
            w.id,
            w.name || '',
            w.phone || '',
            w.email || '',
            w.address || '',
            w.companyName || '',
            w.pendingBalance || 0
          ]);
        }
      }

      // 11. Sync WHOLESALE_ORDERS
      if (parsed.wholesaleOrders && Array.isArray(parsed.wholesaleOrders)) {
        for (const wo of parsed.wholesaleOrders) {
          await poolOrDb.query(`
            INSERT INTO wholesale_orders (id, date, wholesaler_id, total, status, items, payments)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              date = VALUES(date),
              wholesaler_id = VALUES(wholesaler_id),
              total = VALUES(total),
              status = VALUES(status),
              items = VALUES(items),
              payments = VALUES(payments)
          `, [
            wo.id,
            wo.date,
            wo.wholesalerId,
            wo.total,
            wo.status,
            JSON.stringify(wo.items),
            JSON.stringify(wo.payments)
          ]);
        }
      }

      // 12. Sync CURRENT_SESSION
      if (parsed.currentSession) {
        const cs = parsed.currentSession;
        await poolOrDb.query(`
          INSERT INTO current_session (id, opener_id, opener_name, opened_at, expected_cash, actual_cash, difference, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            opener_id = VALUES(opener_id),
            opener_name = VALUES(opener_name),
            opened_at = VALUES(opened_at),
            expected_cash = VALUES(expected_cash),
            actual_cash = VALUES(actual_cash),
            difference = VALUES(difference),
            notes = VALUES(notes),
            status = VALUES(status)
        `, [
          cs.id,
          cs.openerId,
          cs.openerName || '',
          cs.openedAt,
          cs.expectedCash || 0,
          cs.actualCash ?? null,
          cs.difference ?? null,
          cs.notes || null,
          cs.status || 'OPEN'
        ]);
      }

      // 13. Sync SESSIONS_HISTORY
      if (parsed.sessionsHistory && Array.isArray(parsed.sessionsHistory)) {
        for (const sh of parsed.sessionsHistory) {
          await poolOrDb.query(`
            INSERT INTO sessions_history (id, opener_id, opener_name, closer_id, closer_name, opened_at, closed_at, expected_cash, actual_cash, difference, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              opener_id = VALUES(opener_id),
              opener_name = VALUES(opener_name),
              closer_id = VALUES(closer_id),
              closer_name = VALUES(closer_name),
              opened_at = VALUES(opened_at),
              closed_at = VALUES(closed_at),
              expected_cash = VALUES(expected_cash),
              actual_cash = VALUES(actual_cash),
              difference = VALUES(difference),
              notes = VALUES(notes),
              status = VALUES(status)
          `, [
            sh.id,
            sh.openerId,
            sh.openerName || '',
            sh.closerId || null,
            sh.closerName || null,
            sh.openedAt,
            sh.closedAt || null,
            sh.expectedCash || 0,
            sh.actualCash ?? null,
            sh.difference ?? null,
            sh.notes || null,
            sh.status || 'CLOSED'
          ]);
        }
      }

      // 14. Sync SETTINGS
      if (parsed.settings) {
        const st = parsed.settings;
        await poolOrDb.query(`
          INSERT INTO settings (id, is_payment_locked, manual_lock, auto_lock_enabled, opening_time, closing_time, is_cash_session_required, logo_url, store_name, store_address, store_phone, welcome_message_enabled, welcome_message_text, is_database_sync_enabled)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            is_payment_locked = VALUES(is_payment_locked),
            manual_lock = VALUES(manual_lock),
            auto_lock_enabled = VALUES(auto_lock_enabled),
            opening_time = VALUES(opening_time),
            closing_time = VALUES(closing_time),
            is_cash_session_required = VALUES(is_cash_session_required),
            logo_url = VALUES(logo_url),
            store_name = VALUES(store_name),
            store_address = VALUES(store_address),
            store_phone = VALUES(store_phone),
            welcome_message_enabled = VALUES(welcome_message_enabled),
            welcome_message_text = VALUES(welcome_message_text),
            is_database_sync_enabled = VALUES(is_database_sync_enabled)
        `, [
          st.isPaymentLocked ? 1 : 0,
          st.manualLock ? 1 : 0,
          st.autoLockEnabled ? 1 : 0,
          st.openingTime || '',
          st.closingTime || '',
          st.isCashSessionRequired ? 1 : 0,
          st.logoUrl || null,
          st.storeName || '',
          st.storeAddress || '',
          st.storePhone || '',
          st.welcomeMessageEnabled ? 1 : 0,
          st.welcomeMessageText || '',
          (st.isDatabaseSyncEnabled ?? true) ? 1 : 0
        ]);
      }

      // --- MARIADB CLEANUP FOR DELETED ITEMS ---
      if (parsed.users && Array.isArray(parsed.users)) {
        const ids = parsed.users.map((u: any) => u.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM users WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM users`);
        }
      }

      if (parsed.products && Array.isArray(parsed.products)) {
        const pIds = parsed.products.map((p: any) => p.id);
        if (pIds.length > 0) {
          await poolOrDb.query(`DELETE FROM products WHERE id NOT IN (${pIds.map(() => '?').join(',')})`, pIds);
        } else {
          await poolOrDb.query(`DELETE FROM products`);
        }

        const vIds = parsed.products.reduce((acc: any[], p: any) => acc.concat((p.variants || []).map((v: any) => v.id || `${p.id}-${v.size}-${v.color}`)), []);
        if (vIds.length > 0) {
          await poolOrDb.query(`DELETE FROM product_variants WHERE id NOT IN (${vIds.map(() => '?').join(',')})`, vIds);
        } else {
          await poolOrDb.query(`DELETE FROM product_variants`);
        }
      }

      if (parsed.orders && Array.isArray(parsed.orders)) {
        const oIds = parsed.orders.map((o: any) => o.id);
        if (oIds.length > 0) {
          await poolOrDb.query(`DELETE FROM orders WHERE id NOT IN (${oIds.map(() => '?').join(',')})`, oIds);
        } else {
          await poolOrDb.query(`DELETE FROM orders`);
        }

        const itemIds = parsed.orders.reduce((acc: any[], o: any) => acc.concat((o.items || []).map((item: any) => item.id || `${o.id}-${item.product?.id || ''}-${item.variant?.id || ''}`)), []);
        if (itemIds.length > 0) {
          await poolOrDb.query(`DELETE FROM order_items WHERE id NOT IN (${itemIds.map(() => '?').join(',')})`, itemIds);
        } else {
          await poolOrDb.query(`DELETE FROM order_items`);
        }

        const payIds = parsed.orders.reduce((acc: any[], o: any) => acc.concat((o.payments || []).map((p: any) => `${o.id}-${p.method}`)), []);
        if (payIds.length > 0) {
          await poolOrDb.query(`DELETE FROM order_payments WHERE id NOT IN (${payIds.map(() => '?').join(',')})`, payIds);
        } else {
          await poolOrDb.query(`DELETE FROM order_payments`);
        }
      }

      if (parsed.cashMovements && Array.isArray(parsed.cashMovements)) {
        const ids = parsed.cashMovements.map((m: any) => m.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM cash_movements WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM cash_movements`);
        }
      }

      if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) {
        const ids = parsed.stockMovements.map((m: any) => m.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM stock_movements WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM stock_movements`);
        }
      }

      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        const ids = parsed.auditLogs.map((l: any) => l.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM audit_logs WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM audit_logs`);
        }
      }

      if (parsed.customers && Array.isArray(parsed.customers)) {
        const ids = parsed.customers.map((c: any) => c.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM customers WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM customers`);
        }
      }

      if (parsed.promotions && Array.isArray(parsed.promotions)) {
        const ids = parsed.promotions.map((p: any) => p.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM promotions WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM promotions`);
        }
      }

      if (parsed.pendingTickets && Array.isArray(parsed.pendingTickets)) {
        const ids = parsed.pendingTickets.map((t: any) => t.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM pending_tickets WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM pending_tickets`);
        }
      }

      if (parsed.wholesalers && Array.isArray(parsed.wholesalers)) {
        const ids = parsed.wholesalers.map((w: any) => w.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM wholesalers WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM wholesalers`);
        }
      }

      if (parsed.wholesaleOrders && Array.isArray(parsed.wholesaleOrders)) {
        const ids = parsed.wholesaleOrders.map((o: any) => o.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM wholesale_orders WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM wholesale_orders`);
        }
      }

      if (parsed.sessionsHistory && Array.isArray(parsed.sessionsHistory)) {
        const ids = parsed.sessionsHistory.map((s: any) => s.id);
        if (ids.length > 0) {
          await poolOrDb.query(`DELETE FROM sessions_history WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
        } else {
          await poolOrDb.query(`DELETE FROM sessions_history`);
        }
      }
    } else {
      // --- SQLITE SCHEMA ---
      const runSqliteUpsert = (sql: string, params: any[]) => {
        try {
          poolOrDb.prepare(sql).run(...params);
        } catch (sqliteErr: any) {
          console.error('SQLite Sync Upsert Error:', sqliteErr.message);
        }
      };

      // 1. Sync USERS
      if (parsed.users && Array.isArray(parsed.users)) {
        for (const user of parsed.users) {
          runSqliteUpsert(`
            INSERT INTO users (id, name, pin, role, is_active, avatar, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              pin = excluded.pin,
              role = excluded.role,
              is_active = excluded.is_active,
              avatar = excluded.avatar,
              permissions = excluded.permissions
          `, [
            user.id,
            user.name || '',
            user.pin || '',
            user.role || 'CAISSIER',
            user.isActive !== false ? 1 : 0,
            user.avatar || null,
            user.permissions ? JSON.stringify(user.permissions) : null
          ]);
        }
      }

      // 2. Sync PRODUCTS
      if (parsed.products && Array.isArray(parsed.products)) {
        for (const prod of parsed.products) {
          runSqliteUpsert(`
            INSERT INTO products (id, name, category, sub_category, base_price, min_stock_threshold, image_url, image_color, wholesale_price, wholesale_min_qty, bulk_pack_qty, is_wholesale_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              category = excluded.category,
              sub_category = excluded.sub_category,
              base_price = excluded.base_price,
              min_stock_threshold = excluded.min_stock_threshold,
              image_url = excluded.image_url,
              image_color = excluded.image_color,
              wholesale_price = excluded.wholesale_price,
              wholesale_min_qty = excluded.wholesale_min_qty,
              bulk_pack_qty = excluded.bulk_pack_qty,
              is_wholesale_enabled = excluded.is_wholesale_enabled
          `, [
            prod.id,
            prod.name || '',
            prod.category || '',
            prod.subCategory || null,
            prod.basePrice || 0,
            prod.minStockThreshold || 0,
            prod.imageUrl || null,
            prod.imageColor || '',
            prod.wholesalePrice || null,
            prod.wholesaleMinQty || null,
            prod.bulkPackQty || null,
            prod.isWholesaleEnabled ? 1 : 0
          ]);

          if (prod.variants && Array.isArray(prod.variants)) {
            for (const v of prod.variants) {
              runSqliteUpsert(`
                INSERT INTO product_variants (id, product_id, size, color, stock, barcode)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  product_id = excluded.product_id,
                  size = excluded.size,
                  color = excluded.color,
                  stock = excluded.stock,
                  barcode = excluded.barcode
              `, [
                v.id || `${prod.id}-${v.size}-${v.color}`,
                prod.id,
                v.size || '',
                v.color || '',
                v.stock || 0,
                v.barcode || null
              ]);
            }
          }
        }
      }

      // 3. Sync ORDERS
      if (parsed.orders && Array.isArray(parsed.orders)) {
        for (const order of parsed.orders) {
          const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
          const customerId = order.customer?.id || null;
          
          runSqliteUpsert(`
            INSERT INTO orders (id, date, cashier, customer_id, subtotal, tax, discount_total, total, status, amount_paid, original_order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              date = excluded.date,
              cashier = excluded.cashier,
              customer_id = excluded.customer_id,
              subtotal = excluded.subtotal,
              tax = excluded.tax,
              discount_total = excluded.discount_total,
              total = excluded.total,
              status = excluded.status,
              amount_paid = excluded.amount_paid,
              original_order_id = excluded.original_order_id
          `, [
            order.id,
            orderDate,
            order.cashier || '',
            customerId,
            order.subtotal || 0,
            order.tax || 0,
            order.discountTotal || 0,
            order.total || 0,
            order.status || 'COMPLETED',
            order.amountPaid || order.total || 0,
            order.originalOrderId || null
          ]);

          if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
              runSqliteUpsert(`
                INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, discount, manual_price, manual_price_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  order_id = excluded.order_id,
                  product_id = excluded.product_id,
                  variant_id = excluded.variant_id,
                  quantity = excluded.quantity,
                  discount = excluded.discount,
                  manual_price = excluded.manual_price,
                  manual_price_reason = excluded.manual_price_reason
              `, [
                item.id || `${order.id}-${item.product?.id}-${item.variant?.id}`,
                order.id,
                item.product?.id,
                item.variant?.id,
                item.quantity || 1,
                item.discount || 0,
                item.manualPrice || null,
                item.manualPriceReason || null
              ]);
            }
          }

          if (order.payments && Array.isArray(order.payments)) {
            for (const p of order.payments) {
              runSqliteUpsert(`
                INSERT INTO order_payments (id, order_id, method, amount)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  order_id = excluded.order_id,
                  method = excluded.method,
                  amount = excluded.amount
              `, [
                `${order.id}-${p.method}`,
                order.id,
                p.method,
                p.amount
              ]);
            }
          }
        }
      }

      // 4. Sync CASH_MOVEMENTS
      if (parsed.cashMovements && Array.isArray(parsed.cashMovements)) {
        for (const mv of parsed.cashMovements) {
          runSqliteUpsert(`
            INSERT INTO cash_movements (id, type, amount, reason, date, user)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              amount = excluded.amount,
              reason = excluded.reason,
              date = excluded.date,
              user = excluded.user
          `, [mv.id, mv.type, mv.amount, mv.reason || '', mv.date, mv.user]);
        }
      }

      // 5. Sync STOCK_MOVEMENTS
      if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) {
        for (const mv of parsed.stockMovements) {
          runSqliteUpsert(`
            INSERT INTO stock_movements (id, product_id, variant_id, type, quantity, reason, date, user)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              product_id = excluded.product_id,
              variant_id = excluded.variant_id,
              type = excluded.type,
              quantity = excluded.quantity,
              reason = excluded.reason,
              date = excluded.date,
              user = excluded.user
          `, [mv.id, mv.productId, mv.variantId, mv.type, mv.quantity, mv.reason || '', mv.date, mv.user]);
        }
      }

      // 6. Sync AUDIT_LOGS
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        for (const log of parsed.auditLogs) {
          runSqliteUpsert(`
            INSERT INTO audit_logs (id, timestamp, user, action, details, severity)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              timestamp = excluded.timestamp,
              user = excluded.user,
              action = excluded.action,
              details = excluded.details,
              severity = excluded.severity
          `, [log.id, log.timestamp, log.user, log.action, log.details || '', log.severity]);
        }
      }

      // 7. Sync CUSTOMERS
      if (parsed.customers && Array.isArray(parsed.customers)) {
        for (const cust of parsed.customers) {
          runSqliteUpsert(`
            INSERT INTO customers (id, name, phone, loyalty_points, total_spent, last_purchase_date, suspended)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              phone = excluded.phone,
              loyalty_points = excluded.loyalty_points,
              total_spent = excluded.total_spent,
              last_purchase_date = excluded.last_purchase_date,
              suspended = excluded.suspended
          `, [
            cust.id,
            cust.name || '',
            cust.phone || '',
            cust.loyaltyPoints || 0,
            cust.totalSpent || 0,
            cust.lastPurchaseDate || null,
            cust.suspended ? 1 : 0
          ]);
        }
      }

      // 8. Sync PROMOTIONS
      if (parsed.promotions && Array.isArray(parsed.promotions)) {
        for (const promo of parsed.promotions) {
          runSqliteUpsert(`
            INSERT INTO promotions (id, title, image_url, is_active, type, discount_value)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              image_url = excluded.image_url,
              is_active = excluded.is_active,
              type = excluded.type,
              discount_value = excluded.discount_value
          `, [
            promo.id,
            promo.title || '',
            promo.imageUrl || '',
            promo.isActive ? 1 : 0,
            promo.type || 'BANNER',
            promo.discountValue || null
          ]);
        }
      }

      // 9. Sync PENDING_TICKETS
      if (parsed.pendingTickets && Array.isArray(parsed.pendingTickets)) {
        for (const ticket of parsed.pendingTickets) {
          runSqliteUpsert(`
            INSERT INTO pending_tickets (id, name, timestamp, items)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              timestamp = excluded.timestamp,
              items = excluded.items
          `, [ticket.id, ticket.name || '', ticket.timestamp, JSON.stringify(ticket.items)]);
        }
      }

      // 10. Sync WHOLESALERS
      if (parsed.wholesalers && Array.isArray(parsed.wholesalers)) {
        for (const w of parsed.wholesalers) {
          runSqliteUpsert(`
            INSERT INTO wholesalers (id, name, phone, email, address, company_name, pending_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              phone = excluded.phone,
              email = excluded.email,
              address = excluded.address,
              company_name = excluded.company_name,
              pending_balance = excluded.pending_balance
          `, [
            w.id,
            w.name || '',
            w.phone || '',
            w.email || '',
            w.address || '',
            w.companyName || '',
            w.pendingBalance || 0
          ]);
        }
      }

      // 11. Sync WHOLESALE_ORDERS
      if (parsed.wholesaleOrders && Array.isArray(parsed.wholesaleOrders)) {
        for (const wo of parsed.wholesaleOrders) {
          runSqliteUpsert(`
            INSERT INTO wholesale_orders (id, date, wholesaler_id, total, status, items, payments)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              date = excluded.date,
              wholesaler_id = excluded.wholesaler_id,
              total = excluded.total,
              status = excluded.status,
              items = excluded.items,
              payments = excluded.payments
          `, [
            wo.id,
            wo.date,
            wo.wholesalerId,
            wo.total,
            wo.status,
            JSON.stringify(wo.items),
            JSON.stringify(wo.payments)
          ]);
        }
      }

      // 12. Sync CURRENT_SESSION
      if (parsed.currentSession) {
        const cs = parsed.currentSession;
        runSqliteUpsert(`
          INSERT INTO current_session (id, opener_id, opener_name, opened_at, expected_cash, actual_cash, difference, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            opener_id = excluded.opener_id,
            opener_name = excluded.opener_name,
            opened_at = excluded.opened_at,
            expected_cash = excluded.expected_cash,
            actual_cash = excluded.actual_cash,
            difference = excluded.difference,
            notes = excluded.notes,
            status = excluded.status
        `, [
          cs.id,
          cs.openerId,
          cs.openerName || '',
          cs.openedAt,
          cs.expectedCash || 0,
          cs.actualCash ?? null,
          cs.difference ?? null,
          cs.notes || null,
          cs.status || 'OPEN'
        ]);
      }

      // 13. Sync SESSIONS_HISTORY
      if (parsed.sessionsHistory && Array.isArray(parsed.sessionsHistory)) {
        for (const sh of parsed.sessionsHistory) {
          runSqliteUpsert(`
            INSERT INTO sessions_history (id, opener_id, opener_name, closer_id, closer_name, opened_at, closed_at, expected_cash, actual_cash, difference, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              opener_id = excluded.opener_id,
              opener_name = excluded.opener_name,
              closer_id = excluded.closer_id,
              closer_name = excluded.closer_name,
              opened_at = excluded.opened_at,
              closed_at = excluded.closed_at,
              expected_cash = excluded.expected_cash,
              actual_cash = excluded.actual_cash,
              difference = excluded.difference,
              notes = excluded.notes,
              status = excluded.status
          `, [
            sh.id,
            sh.openerId,
            sh.openerName || '',
            sh.closerId || null,
            sh.closerName || null,
            sh.openedAt,
            sh.closedAt || null,
            sh.expectedCash || 0,
            sh.actualCash ?? null,
            sh.difference ?? null,
            sh.notes || null,
            sh.status || 'CLOSED'
          ]);
        }
      }

      // 14. Sync SETTINGS
      if (parsed.settings) {
        const st = parsed.settings;
        runSqliteUpsert(`
          INSERT INTO settings (id, is_payment_locked, manual_lock, auto_lock_enabled, opening_time, closing_time, is_cash_session_required, logo_url, store_name, store_address, store_phone, welcome_message_enabled, welcome_message_text, is_database_sync_enabled)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            is_payment_locked = excluded.is_payment_locked,
            manual_lock = excluded.manual_lock,
            auto_lock_enabled = excluded.auto_lock_enabled,
            opening_time = excluded.opening_time,
            closing_time = excluded.closing_time,
            is_cash_session_required = excluded.is_cash_session_required,
            logo_url = excluded.logo_url,
            store_name = excluded.store_name,
            store_address = excluded.store_address,
            store_phone = excluded.store_phone,
            welcome_message_enabled = excluded.welcome_message_enabled,
            welcome_message_text = excluded.welcome_message_text,
            is_database_sync_enabled = excluded.is_database_sync_enabled
        `, [
          st.isPaymentLocked ? 1 : 0,
          st.manualLock ? 1 : 0,
          st.autoLockEnabled ? 1 : 0,
          st.openingTime || '',
          st.closingTime || '',
          st.isCashSessionRequired ? 1 : 0,
          st.logoUrl || null,
          st.storeName || '',
          st.storeAddress || '',
          st.storePhone || '',
          st.welcomeMessageEnabled ? 1 : 0,
          st.welcomeMessageText || '',
          (st.isDatabaseSyncEnabled ?? true) ? 1 : 0
        ]);
      }

      // --- SQLITE CLEANUP FOR DELETED ITEMS ---
      if (parsed.users && Array.isArray(parsed.users)) {
        const ids = parsed.users.map((u: any) => u.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM users WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM users`).run();
        }
      }

      if (parsed.products && Array.isArray(parsed.products)) {
        const pIds = parsed.products.map((p: any) => p.id);
        if (pIds.length > 0) {
          poolOrDb.prepare(`DELETE FROM products WHERE id NOT IN (${pIds.map(() => '?').join(',')})`).run(...pIds);
        } else {
          poolOrDb.prepare(`DELETE FROM products`).run();
        }

        const vIds = parsed.products.reduce((acc: any[], p: any) => acc.concat((p.variants || []).map((v: any) => v.id || `${p.id}-${v.size}-${v.color}`)), []);
        if (vIds.length > 0) {
          poolOrDb.prepare(`DELETE FROM product_variants WHERE id NOT IN (${vIds.map(() => '?').join(',')})`).run(...vIds);
        } else {
          poolOrDb.prepare(`DELETE FROM product_variants`).run();
        }
      }

      if (parsed.orders && Array.isArray(parsed.orders)) {
        const oIds = parsed.orders.map((o: any) => o.id);
        if (oIds.length > 0) {
          poolOrDb.prepare(`DELETE FROM orders WHERE id NOT IN (${oIds.map(() => '?').join(',')})`).run(...oIds);
        } else {
          poolOrDb.prepare(`DELETE FROM orders`).run();
        }

        const itemIds = parsed.orders.reduce((acc: any[], o: any) => acc.concat((o.items || []).map((item: any) => item.id || `${o.id}-${item.product?.id || ''}-${item.variant?.id || ''}`)), []);
        if (itemIds.length > 0) {
          poolOrDb.prepare(`DELETE FROM order_items WHERE id NOT IN (${itemIds.map(() => '?').join(',')})`).run(...itemIds);
        } else {
          poolOrDb.prepare(`DELETE FROM order_items`).run();
        }

        const payIds = parsed.orders.reduce((acc: any[], o: any) => acc.concat((o.payments || []).map((p: any) => `${o.id}-${p.method}`)), []);
        if (payIds.length > 0) {
          poolOrDb.prepare(`DELETE FROM order_payments WHERE id NOT IN (${payIds.map(() => '?').join(',')})`).run(...payIds);
        } else {
          poolOrDb.prepare(`DELETE FROM order_payments`).run();
        }
      }

      if (parsed.cashMovements && Array.isArray(parsed.cashMovements)) {
        const ids = parsed.cashMovements.map((m: any) => m.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM cash_movements WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM cash_movements`).run();
        }
      }

      if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) {
        const ids = parsed.stockMovements.map((m: any) => m.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM stock_movements WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM stock_movements`).run();
        }
      }

      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        const ids = parsed.auditLogs.map((l: any) => l.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM audit_logs WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM audit_logs`).run();
        }
      }

      if (parsed.customers && Array.isArray(parsed.customers)) {
        const ids = parsed.customers.map((c: any) => c.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM customers WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM customers`).run();
        }
      }

      if (parsed.promotions && Array.isArray(parsed.promotions)) {
        const ids = parsed.promotions.map((p: any) => p.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM promotions WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM promotions`).run();
        }
      }

      if (parsed.pendingTickets && Array.isArray(parsed.pendingTickets)) {
        const ids = parsed.pendingTickets.map((t: any) => t.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM pending_tickets WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM pending_tickets`).run();
        }
      }

      if (parsed.wholesalers && Array.isArray(parsed.wholesalers)) {
        const ids = parsed.wholesalers.map((w: any) => w.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM wholesalers WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM wholesalers`).run();
        }
      }

      if (parsed.wholesaleOrders && Array.isArray(parsed.wholesaleOrders)) {
        const ids = parsed.wholesaleOrders.map((o: any) => o.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM wholesale_orders WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM wholesale_orders`).run();
        }
      }

      if (parsed.sessionsHistory && Array.isArray(parsed.sessionsHistory)) {
        const ids = parsed.sessionsHistory.map((s: any) => s.id);
        if (ids.length > 0) {
          poolOrDb.prepare(`DELETE FROM sessions_history WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
        } else {
          poolOrDb.prepare(`DELETE FROM sessions_history`).run();
        }
      }
    }
  } catch (error: any) {
    console.error('⚠️ Complete Sync Engine Error:', error.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));

  let useMariaDB = process.env.USE_MARIADB === 'true';
  let mariadbPool: any = null;
  const sqliteDb = new Database(SQLITE_DB_FILE);
  sqliteDb.pragma('journal_mode = WAL');

  // Initialize SQLite tables in all cases (as backup state)
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS app_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS transactions_history (
      id TEXT PRIMARY KEY,
      date TEXT,
      client_name TEXT,
      total REAL,
      payment_method TEXT,
      items TEXT,
      created_at TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT, pin TEXT, role TEXT, is_active INTEGER, avatar TEXT, permissions TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT, category TEXT, sub_category TEXT, base_price REAL, min_stock_threshold INTEGER,
      image_url TEXT, image_color TEXT, wholesale_price REAL, wholesale_min_qty INTEGER,
      bulk_pack_qty INTEGER, is_wholesale_enabled INTEGER
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT, size TEXT, color TEXT, stock INTEGER, barcode TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      date TEXT, cashier TEXT, customer_id TEXT, subtotal REAL, tax REAL, discount_total REAL,
      total REAL, status TEXT, amount_paid REAL, original_order_id TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT, product_id TEXT, variant_id TEXT, quantity INTEGER, discount REAL,
      manual_price REAL, manual_price_reason TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS order_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT, method TEXT, amount REAL
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      type TEXT, amount REAL, reason TEXT, date TEXT, user TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT, variant_id TEXT, type TEXT, quantity INTEGER, reason TEXT, date TEXT, user TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT, user TEXT, action TEXT, details TEXT, severity TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT, phone TEXT, loyalty_points INTEGER, total_spent REAL, last_purchase_date TEXT, suspended INTEGER
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      title TEXT, image_url TEXT, is_active INTEGER, type TEXT, discount_value REAL
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS pending_tickets (
      id TEXT PRIMARY KEY,
      name TEXT, timestamp INTEGER, items TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS wholesalers (
      id TEXT PRIMARY KEY,
      name TEXT, phone TEXT, email TEXT, address TEXT, company_name TEXT, pending_balance REAL
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS wholesale_orders (
      id TEXT PRIMARY KEY,
      date TEXT, wholesaler_id TEXT, total REAL, status TEXT, items TEXT, payments TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS current_session (
      id TEXT PRIMARY KEY,
      opener_id TEXT, opener_name TEXT, opened_at TEXT, expected_cash REAL, actual_cash REAL,
      difference REAL, notes TEXT, status TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions_history (
      id TEXT PRIMARY KEY,
      opener_id TEXT, opener_name TEXT, closer_id TEXT, closer_name TEXT, opened_at TEXT,
      closed_at TEXT, expected_cash REAL, actual_cash REAL, difference REAL, notes TEXT, status TEXT
    );
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      is_payment_locked INTEGER, manual_lock INTEGER, auto_lock_enabled INTEGER,
      opening_time TEXT, closing_time TEXT, is_cash_session_required INTEGER, logo_url TEXT,
      store_name TEXT, store_address TEXT, store_phone TEXT, welcome_message_enabled INTEGER, welcome_message_text TEXT,
      is_database_sync_enabled INTEGER
    );
  `);

  try {
    sqliteDb.exec(`ALTER TABLE settings ADD COLUMN is_database_sync_enabled INTEGER;`);
  } catch (err) {
    // If column already exists or table cannot be modified, fail silently
  }

  if (useMariaDB) {
    console.log('🔄 Attempting structure connection to MariaDB...');
    try {
      mariadbPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'zara_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 4000
      });

      // Simple echo / verification check
      await mariadbPool.getConnection();
      console.log('✅ Connected to MariaDB database successfully!');

      // Create MariaDB Tables
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
          id INT PRIMARY KEY,
          data LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS app_messages (
          id VARCHAR(100) PRIMARY KEY,
          sender_id VARCHAR(100) NOT NULL,
          receiver_id VARCHAR(100) NOT NULL,
          text TEXT NOT NULL,
          timestamp VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS transactions_history (
          id VARCHAR(100) PRIMARY KEY,
          date VARCHAR(100),
          client_name VARCHAR(255),
          total DOUBLE,
          payment_method VARCHAR(100),
          items LONGTEXT,
          created_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          pin VARCHAR(50),
          role VARCHAR(50),
          is_active INT DEFAULT 1,
          avatar TEXT,
          permissions LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          category VARCHAR(100),
          sub_category VARCHAR(100),
          base_price DOUBLE,
          min_stock_threshold INT,
          image_url TEXT,
          image_color VARCHAR(100),
          wholesale_price DOUBLE,
          wholesale_min_qty INT,
          bulk_pack_qty INT,
          is_wholesale_enabled INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
          id VARCHAR(100) PRIMARY KEY,
          product_id VARCHAR(100),
          size VARCHAR(100),
          color VARCHAR(100),
          stock INT,
          barcode VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(100) PRIMARY KEY,
          date VARCHAR(100),
          cashier VARCHAR(255),
          customer_id VARCHAR(100),
          subtotal DOUBLE,
          tax DOUBLE,
          discount_total DOUBLE,
          total DOUBLE,
          status VARCHAR(100),
          amount_paid DOUBLE,
          original_order_id VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id VARCHAR(100) PRIMARY KEY,
          order_id VARCHAR(100),
          product_id VARCHAR(100),
          variant_id VARCHAR(100),
          quantity INT,
          discount DOUBLE,
          manual_price DOUBLE,
          manual_price_reason VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS order_payments (
          id VARCHAR(100) PRIMARY KEY,
          order_id VARCHAR(100),
          method VARCHAR(100),
          amount DOUBLE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS cash_movements (
          id VARCHAR(100) PRIMARY KEY,
          type VARCHAR(50),
          amount DOUBLE,
          reason TEXT,
          date VARCHAR(100),
          user VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id VARCHAR(100) PRIMARY KEY,
          product_id VARCHAR(100),
          variant_id VARCHAR(100),
          type VARCHAR(100),
          quantity INT,
          reason TEXT,
          date VARCHAR(100),
          user VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          timestamp VARCHAR(100),
          user VARCHAR(255),
          action VARCHAR(100),
          details TEXT,
          severity VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          phone VARCHAR(100),
          loyalty_points INT,
          total_spent DOUBLE,
          last_purchase_date VARCHAR(100),
          suspended INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(255),
          image_url TEXT,
          is_active INT,
          type VARCHAR(50),
          discount_value DOUBLE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS pending_tickets (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          timestamp BIGINT,
          items TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS wholesalers (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          phone VARCHAR(100),
          email VARCHAR(255),
          address TEXT,
          company_name VARCHAR(255),
          pending_balance DOUBLE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS wholesale_orders (
          id VARCHAR(100) PRIMARY KEY,
          date VARCHAR(100),
          wholesaler_id VARCHAR(100),
          total DOUBLE,
          status VARCHAR(100),
          items TEXT,
          payments TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS current_session (
          id VARCHAR(100) PRIMARY KEY,
          opener_id VARCHAR(100),
          opener_name VARCHAR(100),
          opened_at VARCHAR(100),
          expected_cash DOUBLE,
          actual_cash DOUBLE,
          difference DOUBLE,
          notes TEXT,
          status VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS sessions_history (
          id VARCHAR(100) PRIMARY KEY,
          opener_id VARCHAR(100),
          opener_name VARCHAR(100),
          closer_id VARCHAR(100),
          closer_name VARCHAR(100),
          opened_at VARCHAR(100),
          closed_at VARCHAR(100),
          expected_cash DOUBLE,
          actual_cash DOUBLE,
          difference DOUBLE,
          notes TEXT,
          status VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await mariadbPool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT PRIMARY KEY,
          is_payment_locked INT,
          manual_lock INT,
          auto_lock_enabled INT,
          opening_time VARCHAR(20),
          closing_time VARCHAR(20),
          is_cash_session_required INT,
          logo_url TEXT,
          store_name VARCHAR(255),
          store_address TEXT,
          store_phone VARCHAR(100),
          welcome_message_enabled INT,
          welcome_message_text TEXT,
          is_database_sync_enabled INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (err: any) {
      console.warn('⚠️ DB warning:', err.message);
      console.warn('👉 MariaDB is not reachable (normal in the Cloud Run sandbox). Falling back to SQLite for preview.');
      useMariaDB = false;
    }
  }

  // --- AUTOMATED DATA MIGRATION ENGINE (No Data Loss!) ---
  if (useMariaDB && mariadbPool) {
    try {
      const [rows]: any = await mariadbPool.query('SELECT data FROM app_state WHERE id = 1');
      const isMariaDbEmpty = !rows || rows.length === 0 || !rows[0].data || rows[0].data === '{}';
      
      if (isMariaDbEmpty) {
        console.log('🔄 MariaDB is empty. Migrating existing SQLite / JSON snapshot data to MariaDB...');
        let migratedDataStr = '';
        let migratedMessages: any[] = [];

        // 1. Try SQLite Database first
        try {
          const sqliteRow = sqliteDb.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
          if (sqliteRow && sqliteRow.data && sqliteRow.data !== '{}') {
            migratedDataStr = sqliteRow.data;
          }
        } catch (sqliteErr) {}

        // 2. Try JSON Backup Files
        if (!migratedDataStr || migratedDataStr === '{}') {
          try {
            migratedDataStr = await fs.readFile(DATA_FILE, 'utf-8');
          } catch (e) {
            try {
              const backupFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
              migratedDataStr = await fs.readFile(backupFile, 'utf-8');
            } catch (backupErr) {}
          }
        }

        // 3. Populate state
        if (migratedDataStr && migratedDataStr !== '{}') {
          await mariadbPool.query(
            `INSERT INTO app_state (id, data) VALUES (1, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data)`,
            [migratedDataStr]
          );

          try {
            const parsed = JSON.parse(migratedDataStr);
            if (parsed.orders && Array.isArray(parsed.orders)) {
              for (const order of parsed.orders) {
                const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
                const clientName = order.customer?.name || null;
                const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
                await mariadbPool.query(
                  `INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE 
                     client_name = VALUES(client_name),
                     total = VALUES(total),
                     payment_method = VALUES(payment_method),
                     items = VALUES(items)`,
                  [order.id, orderDate, clientName, order.total, paymentMethodStr, JSON.stringify(order.items), orderDate]
                );
              }
            }
          } catch (parsedErr) {}
        }

        // 4. Messages migration
        try {
          const sqliteMsgs = sqliteDb.prepare('SELECT * FROM app_messages').all() as any[];
          if (sqliteMsgs && sqliteMsgs.length > 0) {
            migratedMessages = sqliteMsgs.map(m => ({
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              text: m.text,
              timestamp: m.timestamp
            }));
          }
        } catch (mErr) {}

        if (migratedMessages.length === 0) {
          try {
            const backupFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
            const backupContent = await fs.readFile(backupFile, 'utf-8');
            const parsed = JSON.parse(backupContent);
            if (parsed.messages) {
              migratedMessages = parsed.messages;
            }
          } catch (e) {}
        }

        if (migratedMessages.length > 0) {
          for (const msg of migratedMessages) {
            await mariadbPool.query(
              `INSERT INTO app_messages (id, sender_id, receiver_id, text, timestamp)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE text = VALUES(text)`,
              [msg.id, msg.senderId || msg.sender_id, msg.receiverId || msg.receiver_id || 'GLOBAL', msg.text, msg.timestamp]
            );
          }
        }
        console.log('✅ Auto-migration to MariaDB completed successfully!');
      }
    } catch (migrationErr: any) {
      console.error('❌ Data migration to MariaDB encountered an issue:', migrationErr.message);
    }
  } else {
    // --- SQLITE-ONLY SEEDING PATH ---
    let existingStateRow = sqliteDb.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
    let isDbStateEmpty = !existingStateRow || !existingStateRow.data || existingStateRow.data === '{}' || existingStateRow.data === '{"products":[]}';

    if (isDbStateEmpty) {
      let initialData = '{}';
      try { 
        initialData = await fs.readFile(DATA_FILE, 'utf-8'); 
        console.log('✅ Found root backup data from zara_database.json');
      } catch(e) {
        try {
          const backupFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
          initialData = await fs.readFile(backupFile, 'utf-8');
          console.log('✅ Recovered state from committed backup zara_gestion_db/zara_data.json successfully!');
        } catch(backupErr) {
          console.error('❌ Could not read any master data backup file', backupErr);
        }
      }
      
      if (initialData && initialData !== '{}') {
        sqliteDb.prepare(`
          INSERT INTO app_state (id, data) VALUES (1, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(initialData);

        try {
          const parsed = JSON.parse(initialData);
          if (parsed.orders && Array.isArray(parsed.orders)) {
            const insertTx = sqliteDb.prepare(`
              INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                client_name = excluded.client_name,
                total = excluded.total,
                payment_method = excluded.payment_method,
                items = excluded.items
            `);
            const insertMany = sqliteDb.transaction((orders) => {
              for (const order of orders) {
                const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
                const clientName = order.customer?.name || null;
                const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
                insertTx.run(
                  order.id, 
                  orderDate,
                  clientName,
                  order.total,
                  paymentMethodStr,
                  JSON.stringify(order.items),
                  orderDate
                );
              }
            });
            insertMany(parsed.orders);
            console.log('✅ Synced orders to transactions_history table');
          }
        } catch(e) {
          console.error('Error syncing orders during migration:', e);
        }
      }
    }

    // Seed / Migrate app_messages if empty
    const msgRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM app_messages').get() as { count: number };
    if (msgRow.count === 0) {
      try {
        let messagesData = '';
        try {
          messagesData = await fs.readFile(MESSAGES_FILE, 'utf-8');
        } catch (e) {
          const backupFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
          const backupContent = await fs.readFile(backupFile, 'utf-8');
          const parsed = JSON.parse(backupContent);
          if (parsed.messages) {
            messagesData = JSON.stringify(parsed.messages);
          }
        }

        if (messagesData) {
          const messages = JSON.parse(messagesData);
          if (Array.isArray(messages) && messages.length > 0) {
            const insertMsg = sqliteDb.prepare(`
              INSERT INTO app_messages (id, sender_id, receiver_id, text, timestamp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO NOTHING
            `);
            const insertMany = sqliteDb.transaction((msgs) => {
              for (const msg of msgs) {
                insertMsg.run(msg.id, msg.senderId || msg.sender_id, msg.receiverId || msg.receiver_id || 'GLOBAL', msg.text, msg.timestamp);
              }
            });
            insertMany(messages);
            console.log('✅ Migrated messages list successfully to SQLite');
          }
        }
      } catch(e) {
        console.error('Error migrating message logs from backup:', e);
      }
    }
  }

  // --- BOOTSTATE SYNC ENGINE ---
  try {
    let startupDataStr = '';
    if (useMariaDB && mariadbPool) {
      const [rows]: any = await mariadbPool.query('SELECT data FROM app_state WHERE id = 1');
      if (rows && rows.length > 0) {
        startupDataStr = rows[0].data;
      }
    } else {
      const dbRow = sqliteDb.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
      if (dbRow && dbRow.data) {
        startupDataStr = dbRow.data;
      }
    }
    if (startupDataStr && startupDataStr !== '{}') {
      const parsed = JSON.parse(startupDataStr);
      console.log('⚙️ Running boot synchronization of state JSON to separate relational tables...');
      await syncAllStateToIndividualTables(parsed, useMariaDB, useMariaDB ? mariadbPool : sqliteDb);
      console.log('✅ Boot synchronization of state JSON to separate relational tables completed!');
    }
  } catch (bootSyncErr: any) {
    console.error('⚠️ Boot sync error:', bootSyncErr.message);
  }

  // --- API ROUTES ---

  // Create uploads directory if it doesn't exist
  const uploadsDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(rootDir, 'uploads');
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }

  app.use('/uploads', express.static(uploadsDir));

  // Load all data
  app.get('/api/data', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
      let dataStr: string | null = null;
      if (useMariaDB && mariadbPool) {
        const [rows]: any = await mariadbPool.query('SELECT data FROM app_state WHERE id = 1');
        if (rows && rows.length > 0) {
          dataStr = rows[0].data;
        }
      } else {
        const dbRow = sqliteDb.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
        if (dbRow && dbRow.data) {
          dataStr = dbRow.data;
        }
      }

      if (dataStr) {
        return res.json(JSON.parse(dataStr));
      } else {
        return res.json({});
      }
    } catch (error) {
      console.error('Failed to read database', error);
      res.status(500).json({ error: 'Failed to read database' });
    }
  });

  // Save all data
  app.post('/api/data', async (req, res) => {
    try {
      const dataStr = JSON.stringify(req.body, null, 2);
      
      if (useMariaDB && mariadbPool) {
        await mariadbPool.query(
          `INSERT INTO app_state (id, data) VALUES (1, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [dataStr]
        );

        // Sync orders into the transactions_history table
        if (req.body.orders && Array.isArray(req.body.orders)) {
          for (const order of req.body.orders) {
            const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
            const clientName = order.customer?.name || null;
            const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
            
            await mariadbPool.query(
              `INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE 
                 client_name = VALUES(client_name),
                 total = VALUES(total),
                 payment_method = VALUES(payment_method),
                 items = VALUES(items)`,
              [order.id, orderDate, clientName, order.total, paymentMethodStr, JSON.stringify(order.items), orderDate]
            );
          }
        }
      } else {
        // SQLite UPSERT
        sqliteDb.prepare(`
          INSERT INTO app_state (id, data) VALUES (1, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(dataStr);
        
        // Sync orders into the partitioned transactions_history table
        if (req.body.orders && Array.isArray(req.body.orders)) {
          const insertTx = sqliteDb.prepare(`
            INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
              client_name = excluded.client_name,
              total = excluded.total,
              payment_method = excluded.payment_method,
              items = excluded.items
          `);
          
          const syncOrders = sqliteDb.transaction((orders) => {
            for (const order of orders) {
              const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
              const clientName = order.customer?.name || null;
              const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
              
              insertTx.run(
                order.id, 
                orderDate,
                clientName,
                order.total,
                paymentMethodStr,
                JSON.stringify(order.items),
                orderDate
              );
            }
          });
          syncOrders(req.body.orders);
        }
      }
      
      // Sync all business records into structured relational tables in parallel (non-blocking)
      syncAllStateToIndividualTables(req.body, useMariaDB, useMariaDB ? mariadbPool : sqliteDb).catch(syncErr => {
        console.error('⚠️ Post-save relational sync check failed:', syncErr.message);
      });
      
      // Secondary local JSON files (redundant backups to avoid data loss in the container)
      fs.writeFile(DATA_FILE, dataStr).catch(err => console.error('Backup write error', err));
      
      const backupDirFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
      fs.writeFile(backupDirFile, dataStr).catch(err => console.error('Backup folder write error', err));
      
      res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Save error:', error);
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // --- MESSAGES COMPONENT API ---
  app.get('/api/messages', async (req, res) => {
    try {
      let rows: any[] = [];
      if (useMariaDB && mariadbPool) {
        const [dbRows]: any = await mariadbPool.query('SELECT * FROM app_messages ORDER BY timestamp ASC');
        rows = dbRows;
      } else {
        rows = sqliteDb.prepare('SELECT * FROM app_messages ORDER BY timestamp ASC').all() as any[];
      }

      const messages = rows.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        receiverId: r.receiver_id === 'GLOBAL' ? undefined : r.receiver_id,
        text: r.text,
        timestamp: r.timestamp
      }));
      return res.json(messages);
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const { id, senderId, receiverId, text, timestamp } = req.body;
      if (!id || !senderId || !text || !timestamp) {
        return res.status(400).json({ error: 'Missing required message parameters' });
      }

      if (useMariaDB && mariadbPool) {
        await mariadbPool.query(
          `INSERT INTO app_messages (id, sender_id, receiver_id, text, timestamp)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE text = VALUES(text)`,
          [id, senderId, receiverId || 'GLOBAL', text, timestamp]
        );
      } else {
        sqliteDb.prepare(`
          INSERT INTO app_messages (id, sender_id, receiver_id, text, timestamp)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET text = excluded.text
        `).run(id, senderId, receiverId || 'GLOBAL', text, timestamp);
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('Post message error:', err);
      res.status(500).json({ error: 'Failed to save message' });
    }
  });

  // Upload an image file (logo, product, banner, etc.)
  app.post('/api/upload', async (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!filename || !base64) {
        return res.status(400).json({ error: 'Missing filename or base64 data' });
      }

      // Strip off base64 content-type header if present
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let dataBuffer: Buffer;

      if (matches && matches.length === 3) {
        dataBuffer = Buffer.from(matches[2], 'base64');
      } else {
        dataBuffer = Buffer.from(base64, 'base64');
      }

      const cleanName = path.basename(filename).replace(/[^a-zA-Z0-9.\-_]/g, '');
      const uniqueName = `${Date.now()}-${cleanName}`;
      const filePath = path.join(uploadsDir, uniqueName);

      await fs.writeFile(filePath, dataBuffer);

      res.json({ 
        success: true, 
        url: `/uploads/${uniqueName}` 
      });
    } catch (e) {
      console.error('Upload failed:', e);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Get database engine status
  app.get('/api/db/status', (req, res) => {
    res.json({
      useMariaDB: !!useMariaDB,
      activeDb: useMariaDB ? 'MariaDB' : 'SQLite',
      connected: true,
      sqlitePath: SQLITE_DB_FILE,
      mariadbHost: process.env.DB_HOST || '127.0.0.1',
      mariadbDatabase: process.env.DB_NAME || 'zara'
    });
  });

  // Health check for local network clients
  app.get('/api/health', (req, res) => {
    res.json({ status: 'running', serverTime: new Date().toISOString(), mode: 'local-offline' });
  });

  // Download raw SQLite database file directly from browser
  app.get('/api/db/download', (req, res) => {
    try {
      res.download(SQLITE_DB_FILE, 'zara_database.sqlite');
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to download SQLite file: ' + err.message });
    }
  });

  // Manually import the local JSON backup (zara_database.json) into the active database
  app.post('/api/db/import-json', async (req, res) => {
    try {
      if (!fsSync.existsSync(DATA_FILE)) {
        return res.status(404).json({ error: `Le fichier de sauvegarde JSON n'a pas été trouvé sur le serveur à l'emplacement: ${DATA_FILE}` });
      }

      const rawData = await fs.readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(rawData);

      // Perform schema-like checks to make sure the JSON format is compliant
      if (!parsed.products || !Array.isArray(parsed.products)) {
        return res.status(400).json({ error: "Le fichier JSON n'appartient pas à Zara Gallery ou a un format incorrect." });
      }

      let syncedOrdersCount = 0;

      if (useMariaDB && mariadbPool) {
        await mariadbPool.query(
          `INSERT INTO app_state (id, data) VALUES (1, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [rawData]
        );

        if (parsed.orders && Array.isArray(parsed.orders)) {
          for (const order of parsed.orders) {
            const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
            const clientName = order.customer?.name || null;
            const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
            
            await mariadbPool.query(
              `INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE 
                 client_name = VALUES(client_name),
                 total = VALUES(total),
                 payment_method = VALUES(payment_method),
                 items = VALUES(items)`,
              [order.id, orderDate, clientName, order.total, paymentMethodStr, JSON.stringify(order.items), orderDate]
            );
          }
          syncedOrdersCount = parsed.orders.length;
        }
      } else {
        // Upsert the whole payload into the SQLite data table with ID = 1
        sqliteDb.prepare(`
          INSERT INTO app_state (id, data) VALUES (1, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(rawData);

        // Synchronize orders into the transactions_history partition
        if (parsed.orders && Array.isArray(parsed.orders)) {
          const insertTx = sqliteDb.prepare(`
            INSERT INTO transactions_history (id, date, client_name, total, payment_method, items, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              client_name = excluded.client_name,
              total = excluded.total,
              payment_method = excluded.payment_method,
              items = excluded.items
          `);
          const insertMany = sqliteDb.transaction((orders) => {
            for (const order of orders) {
              const orderDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');
              const clientName = order.customer?.name || null;
              const paymentMethodStr = order.payments?.map((p: any) => p.method).join(', ') || 'CASH';
              insertTx.run(
                order.id, 
                orderDate,
                clientName,
                order.total,
                paymentMethodStr,
                JSON.stringify(order.items),
                orderDate
              );
            }
          });
          insertMany(parsed.orders);
          syncedOrdersCount = parsed.orders.length;
        }
      }

      // Sync backups
      await fs.writeFile(DATA_FILE, rawData).catch(() => {});
      const backupDirFile = path.join(rootDir, 'zara_gestion_db', 'zara_data.json');
      await fs.writeFile(backupDirFile, rawData).catch(() => {});

      // Sync all business records into structured relational tables (non-blocking)
      syncAllStateToIndividualTables(parsed, useMariaDB, useMariaDB ? mariadbPool : sqliteDb).catch(syncErr => {
        console.error('⚠️ Import-save relational sync check failed:', syncErr.message);
      });

      res.json({
        success: true,
        message: 'Importation et synchronisation complètes effectuées !',
        stats: {
          products: parsed.products?.length || 0,
          orders: syncedOrdersCount,
          users: parsed.users?.length || 0,
          customers: parsed.customers?.length || 0,
          promotions: parsed.promotions?.length || 0,
          wholesalers: parsed.wholesalers?.length || 0,
        }
      });
    } catch (e: any) {
      console.error('Failed to import JSON schema:', e);
      res.status(500).json({ error: "Échec de l'intégration du fichier de sauvegarde : " + e.message });
    }
  });

  // Generate and download a readable SQL dump of the live database (SQLite or MariaDB)
  app.get('/api/db/dump', async (req, res) => {
    try {
      if (useMariaDB && mariadbPool) {
        let sqlDump = `-- ====================================================\n`;
        sqlDump += `-- ZARA GALLERY - MARIADB DATABASE DUMP\n`;
        sqlDump += `-- Exported on: ${new Date().toISOString()}\n`;
        sqlDump += `-- ====================================================\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

        const tables = [
          'app_state',
          'app_messages',
          'transactions_history',
          'users',
          'products',
          'product_variants',
          'orders',
          'order_items',
          'order_payments',
          'cash_movements',
          'stock_movements',
          'audit_logs',
          'customers',
          'promotions',
          'pending_tickets',
          'wholesalers',
          'wholesale_orders',
          'current_session',
          'sessions_history',
          'settings'
        ];
        for (const tableName of tables) {
          sqlDump += `-- ----------------------------------------------------\n`;
          sqlDump += `-- Table structure for table \`${tableName}\`\n`;
          sqlDump += `-- ----------------------------------------------------\n`;
          sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
          
          const [showRows]: any = await mariadbPool.query(`SHOW CREATE TABLE \`${tableName}\``);
          if (showRows && showRows.length > 0) {
            sqlDump += `${showRows[0]['Create Table']};\n\n`;
          }

          const [rows]: any = await mariadbPool.query(`SELECT * FROM \`${tableName}\``);
          if (rows && rows.length > 0) {
            sqlDump += `-- Dumping data for table \`${tableName}\`\n`;
            for (const row of rows) {
              const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
              const values = Object.values(row).map((val: any) => {
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return val;
                return `'${String(val).replace(/'/g, "''")}'`;
              }).join(', ');
              sqlDump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
            }
            sqlDump += `\n`;
          }
        }
        
        sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="zara_database_dump.sql"');
        return res.send(sqlDump);
      } else {
        // SQLite
        let sqlDump = `-- ====================================================\n`;
        sqlDump += `-- ZARA GALLERY - SQLITE DATABASE DUMP\n`;
        sqlDump += `-- Exported on: ${new Date().toISOString()}\n`;
        sqlDump += `-- ====================================================\n\n`;
        sqlDump += `PRAGMA foreign_keys=OFF;\n\n`;

        const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];

        for (const table of tables) {
          const tableName = table.name;
          const colInfo = sqliteDb.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];
          const colNames = colInfo.map(c => `"${c.name}"`).join(', ');

          const rows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all() as any[];
          
          sqlDump += `-- ----------------------------------------------------\n`;
          sqlDump += `-- Table structure for table "${tableName}"\n`;
          sqlDump += `-- ----------------------------------------------------\n`;
          sqlDump += `DROP TABLE IF EXISTS "${tableName}";\n`;
          
          const createInfo = sqliteDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName) as any;
          if (createInfo && createInfo.sql) {
            sqlDump += `${createInfo.sql};\n\n`;
          }

          if (rows.length > 0) {
            sqlDump += `-- Dumping data for table "${tableName}"\n`;
            for (const row of rows) {
              const values = colInfo.map(c => {
                const val = row[c.name];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return val;
                return `'${String(val).replace(/'/g, "''")}'`;
              }).join(', ');
              sqlDump += `INSERT INTO "${tableName}" (${colNames}) VALUES (${values});\n`;
            }
            sqlDump += `\n`;
          }
        }
        
        sqlDump += `PRAGMA foreign_keys=ON;\n`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="zara_database_dump.sql"');
        res.send(sqlDump);
      }
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to generate schema/data dump: ' + e.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenWithFallback = (portToTry: number) => {
    const serverInstance = app.listen(portToTry, '0.0.0.0', () => {
      console.log('----------------------------------------------------');
      console.log(`ZARA GALLERY - SERVEUR LOCAL ACTIVÉ`);
      console.log(`Accès local : http://localhost:${portToTry}`);
      console.log(`Accès Boutique (Wi-Fi) : http://[VOTRE-IP]:${portToTry}`);
      console.log('----------------------------------------------------');
    });

    serverInstance.on('error', (err: any) => {
      const fallbackPort = PORT + 1;
      if (err.code === 'EADDRINUSE' && portToTry === PORT) {
        console.warn(`⚠️ Le port ${portToTry} est déjà occupé. Tentative de repli automatique sur le port ${fallbackPort}...`);
        listenWithFallback(fallbackPort);
      } else {
        console.error('❌ Erreur de démarrage du serveur :', err);
      }
    });
  };

  listenWithFallback(PORT);
}

startServer();

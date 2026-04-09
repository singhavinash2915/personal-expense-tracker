#!/bin/sh
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /Users/avinashsingh/Documents/expense-tracker-app
exec node node_modules/.bin/vite --port 5173 --host

# Playing between two computers

One player's computer runs the **game host**. Both players then use a web browser: the host
player on the same computer, and the other player (the guest) on theirs. There is no account, no
paid server and no router setup.

Windows PCs and Macs work in any combination: either one can host, and either one can join.

## What each player needs

| | Host player | Guest |
|---|---|---|
| Computer | Windows or macOS | Windows or macOS |
| Software | Node.js 22.12 or newer (nodejs.org), and this project (`npm install` once) | A current Chrome, Edge, Firefox or Safari. Nothing else |
| Different houses | Tailscale, signed in; **or** a tunnel program run from a folder, when you cannot install software (see [Work computers](#work-computers-no-admin-rights-a-tunnel)) | Tailscale, signed in to the **same** tailnet; **or** nothing at all, with a tunnel |

## 1. Start the host

On the host computer, open a terminal in the project folder. On Windows, use PowerShell or the
VS Code terminal. On a Mac, use Terminal (in Applications → Utilities) or the VS Code terminal.
Then run:

```sh
npm run host
```

It builds the browser client, then prints something like:

```
WW2Hex game host (Stage 3)
  Host player, open:     http://localhost:8790/
  On the home network:   http://192.168.1.20:8790/
  Over Tailscale:        http://100.101.102.103:8790/
```

Keep that window open for the whole session. **Ctrl+C** stops the host (on a Mac too: Control,
not Command). Games are saved as you play, so you can start it again later and carry on. A
sleeping computer cannot host: keep it awake while you play.

**Firewall, the first time only:**

- **Windows** asks whether Node.js may communicate on networks. Allow it on **Private networks**.
  If you pressed Cancel, or your network is marked Public, the guest's browser will not connect;
  see Troubleshooting below.
- **macOS** asks whether "node" may accept incoming network connections. Click **Allow**. If you
  clicked Deny, see Troubleshooting below.
- A work laptop's firewall may be controlled by your IT department.

## 2. Host a game

1. On the host computer, open **http://localhost:8790/**.
2. Under **Host a new game**, pick the scenario and your side, then **Start hosting**.
3. A box shows the **room code** and the **invitation links**. Send the guest the link for your
   situation (by message or email):
   - **Same home network**: the `192.168…` (or `10…`) link.
   - **Different houses**: the `100…` Tailscale link, or the tunnel address (below) with
     `?room=` and the room code on the end.

You can plan your first turn while you wait. Reopen the box from **Room ABC123** in the top bar.

## 3. Join a game

The guest opens the link. The room code is filled in; press **Join**. They get the side the host
did not take.

You can also type the address (for example `http://192.168.1.20:8790/`) and then enter the room
code.

## 4. Play

- Each player plans in secret and presses **Lock orders**. When both have locked, the turn
  resolves on the host.
- Each player then watches a replay of what their own side saw, and presses **Finish replay**.
- The next turn starts once both have finished. The top bar shows what the other player is doing,
  and a green dot when they are connected.
- The match ends when a side achieves its objective, when one side has no units left, or after the
  last turn. The result appears after the replay of the deciding turn.

## Stopping and resuming

- **Closing a browser tab** is fine. Reopen the same link in the same browser and you are back in
  your seat, with locked orders and the current phase as they were.
- **Stopping the host** (Ctrl+C, a restart, or the computer shutting down) is fine too. Run
  `npm run host` again. Open browser pages reconnect by themselves within a few seconds. A page
  that was closed can rejoin from the lobby under **Your games in this browser**.
- The host computer lists every saved game under **Saved games on this computer**. Saves are in the
  `saves/` folder.

**Seats belong to a browser.** Joining stores a private key in that browser. The room code lets
someone take the open side **once**; after that, it cannot take a side. If the guest switches
computer or clears their browser data, the host can press **release** next to that side in the
saved games list. The guest then joins again with the room code.

## Different houses: Tailscale

Tailscale puts both computers on a private network without any router changes. Its free Personal
plan covers playing games with friends.

1. Both players install Tailscale from tailscale.com and sign in.
2. The host invites the guest to their tailnet: Tailscale admin console → **Users** → **Invite
   users**. Alternatively, share just the host computer: **Machines** → the host computer →
   **Share**.
3. Check that both computers show as connected in the Tailscale app.
4. Start the host. Its window shows an **Over Tailscale** address starting with `100.`. Send the
   guest that link.

The game knows nothing about Tailscale; it just listens on the computer's addresses. Any other way
of making the host reachable works the same way.

## Work computers, no admin rights: a tunnel

On a managed work laptop you usually cannot install Tailscale, and the Windows firewall prompt
that appears the first time Node.js listens for connections needs an administrator. Without it,
nobody can connect **in** to your computer. A tunnel gets round both: a small program on the host
computer opens an **outgoing** connection to a relay service, and the guest reaches your game
through the relay's address. Nothing listens from outside, so the firewall never asks, and the
guest installs nothing. The game host already accepts the relay's addresses; there is nothing to
configure.

Check your organisation's rules first: this is personal use of a work computer and network, and
some IT departments block tunnel services.

**Cloudflare quick tunnel** (no account, free):

1. Download `cloudflared` for your computer from
   https://github.com/cloudflare/cloudflared/releases (on Windows, `cloudflared-windows-amd64.exe`;
   on a Mac, the `darwin` build or `brew install cloudflared`). Put it in any folder of your own,
   such as Downloads, and on Windows rename it `cloudflared.exe`. It needs no installation.
2. Start the game host as usual (`npm run host`) and leave it running.
3. In a second terminal, in the folder with the program:

   ```
   .\cloudflared.exe tunnel --url http://localhost:8790
   ```

   (On a Mac: `./cloudflared tunnel --url http://localhost:8790`.) After a few seconds it prints
   an address like `https://quiet-river-1234.trycloudflare.com`. Keep this window open too.
4. Host a game in your browser at http://localhost:8790/ as usual, and send the guest the tunnel
   address with the room code on the end:

   ```
   https://quiet-river-1234.trycloudflare.com/?room=ABC123
   ```

   The invitation box cannot show this address, because the game does not know about the tunnel;
   copy it from the tunnel window. The guest opens it and presses **Join**.

**localtunnel** (runs inside Node, if a separate program is not allowed):

```
npx localtunnel --port 8790
```

It prints an address like `https://brave-cats-sing.loca.lt`. The first time the guest opens it, the
service shows a page asking for a "tunnel password": that is the host computer's public address,
which the host can read at https://loca.lt/mytunnelpassword and send along with the link. The
service is free and often slow or blocked by company filters; try Cloudflare first.

**What to expect**

- The address changes every time the tunnel starts. Send the new one each session.
- Anyone who has the address can open the lobby, but can do nothing without a room code: a
  connection through a tunnel is never treated as the host computer, so it cannot start games,
  list saved games or release seats. A room code takes the open side once.
- Stop the tunnel with Ctrl+C when you finish. Saved games stay on the host computer as usual.
- Both players' browsers show `https://` through a tunnel; the host player still uses
  http://localhost:8790/ locally.
- If the tunnel program will not run at all (a policy message, or it closes at once), the
  computer's software restrictions block it, and only IT can change that. The remaining option
  is to host from a computer you control, such as a home PC with Tailscale.

## Troubleshooting

| Problem | What to try |
|---|---|
| Guest's browser says the site can't be reached | Is the host window still open, and the host computer awake? Is the guest using an address from the host window (not `localhost`)? Then check the host's firewall, below |
| Firewall on a Windows host | Settings → Privacy & security → Windows Security → Firewall → **Allow an app through firewall** → tick **Private** for Node.js. Also check the network is marked Private: Settings → Network & internet → your network → **Private network**. If this needs an administrator you do not have, use a tunnel (above) |
| Firewall on a Mac host | System Settings → Network → Firewall → Options. Set **node** to **Allow incoming connections** (or remove it, and allow it when asked next time) |
| Page says "Connection to the host lost" or "Cannot reach the host" | The host stopped, or the network dropped. Start the host again if needed; the page reconnects by itself |
| "No game with that room code on this host" | Check the code (it is not case sensitive). Make sure the guest is connected to the right host address |
| "Both sides of this game are taken" | Rejoin from the browser you joined with, or ask the host to release your seat |
| "This browser no longer holds a seat" | The seat was released, or browser data was cleared. The host releases the seat; join again with the room code |
| No **Over Tailscale** address in the host window | Tailscale is not connected on the host computer. Connect it, then restart the host |
| Host says the port is already in use | The host is already running in another window. Or use another port. Mac Terminal: `PORT=8791 npm run host`. Windows PowerShell: `$env:PORT=8791; npm run host` |
| "This page is out of date" | The host was updated. Reload the page |

**Settings** (environment variables for `npm run host`). Set them the same way as `PORT` in the row
above:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8790` | The port to listen on |
| `HOST` | `0.0.0.0` | `0.0.0.0` accepts this computer, the home network and Tailscale. `127.0.0.1` accepts only this computer |
| `SAVES_DIR` | `saves/` | Where games are saved |
| `ALLOWED_HOSTS` | (none) | Extra names the guest may use to reach the host, for example a custom DNS name. IP addresses, `localhost`, the computer's own name, Tailscale `*.ts.net` names and the tunnel names `*.trycloudflare.com` and `*.loca.lt` always work |

## Test checklist for Stage 3

Work through these in order. Each step needs the previous one to work.

**A. Two browsers on one computer**

1. `npm run host`. Open `http://localhost:8790/`, then host as Allied.
2. Open a second window: a private window, or another browser. Paste the invitation link and Join.
   It takes the German side.
3. Play until the match ends. The Allied side can win by taking Northton and the north end of the
   bridge and holding both for two turn ends. The German side wins if that has not happened by the
   end of turn 8.

**B. Two computers on the home network**

1. Host on computer 1. Open the `192.168…` link on computer 2 and join.
2. Play a few turns. Along the way:
   - Lock on one computer, then close that tab, reopen the link and check the orders are still
     locked.
   - Stop the host with Ctrl+C after one side has locked. Start it again. Both pages reconnect,
     and the turn resolves when the other side locks.
   - Put the guest computer to sleep for a minute. The host player sees the guest go grey and come
     back.

**C. Two houses over Tailscale**

1. Set up Tailscale as above. Host, then send the `100…` link.
2. Play at least one full turn. Then repeat the reconnect check.

Note anything confusing or broken, with the time and what each screen showed. The host window
prints a line for every room created, seat claimed and turn resolved, which helps match things up.

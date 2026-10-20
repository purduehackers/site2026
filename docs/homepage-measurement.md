# Homepage measurement

Discord joining and first-time event attendance are equally important outcomes.
The homepage records entry-point clicks through the existing Umami tracker.
Vercel Analytics continues to record pageviews.

| Event | `placement` values | Meaning |
| --- | --- | --- |
| `website_discord_click` | `header`, `mobile_menu`, `hero`, `hack_night`, `community_text`, `community_button`, `footer` | A visitor opened a Discord invitation |
| `website_event_click` | `header`, `mobile_menu`, `hero`, `hack_night`, `the_show` | A visitor opened the events directory or a specific event |
| `website_microgrants_click` | `header`, `mobile_menu`, `microgrants` | A visitor opened the grants site |

These use [Umami's native event attributes](https://v2.umami.is/docs/track-events).
The tracker is restricted to `purduehackers.com` and `www.purduehackers.com` so
localhost and Vercel preview visits do not pollute the production dataset.
No names, email addresses, Discord IDs, or project content are added as event
properties. Links work if analytics is blocked.

## Read the funnel

Compare the share of homepage visitors clicking each route, split by mobile
versus desktop and placement. Use unique visitors where supported, the same
date window, and the same hostname/path filters for numerator and denominator.
Do not sum unique counts across placements: one person may use several links.
Keep raw click totals separate from visitor conversion rates.

Clicking Discord does not establish a successful join. Visiting an event page
or submitting an RSVP does not establish attendance. Measuring those outcomes
requires invite/join reporting and first-visit check-in data from their owning
systems. This change does not create those integrations or infer cross-site
identity.

## Verify after release

On the production homepage, open one Discord link and one event link. Check
Umami for the corresponding event names and `placement` values. Confirm the
links still open with analytics disabled. Preview and local markup checks
verify the attributes; they do not establish production ingestion.

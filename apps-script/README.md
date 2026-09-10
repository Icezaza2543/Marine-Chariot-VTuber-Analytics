# Sheet automation

`Code.gs` is the source for the bound [MarineDataFetch project](https://script.google.com/u/0/home/projects/1EBNFhvgB7qZpEuu7ziLNnE_Aa_G9jdSj57tCQyIosR6GddrX6VU2ISMN/edit).

## Operations

- Keep the existing time trigger for `fetchNewVideosAndCalculate`, every 12 hours. It contains no UI alerts, so unattended execution works. Run it manually from the editor or the sheet's YouTube Auto menu when needed.
- The existing YouTube credential is stored in Script Properties as `YOUTUBE_API_KEY`. Never put credentials in source, the dashboard environment, or this repository.
- `LAST_SUCCESSFUL_SYNC` records successful writes; `LAST_SYNC_ERROR` records a failed run. Inspect execution logs for failures.
- Discovery uses the channel uploads playlist, paginated until complete. Statistics are fetched in batches of 50 before writing. New finished videos are inserted with metrics together; existing incomplete rows are repaired. Unavailable videos keep their previous data. Disabled/missing counts stay missing, rather than being fabricated as zero.
- A script lock prevents concurrent refreshes. Before writing, compare the sheet to the initial read and abort if a user edited it. Preserve formatting, validation, and valid manual categories. The sheet has no formulas as of this migration; this updater owns the 13 data columns.
- Average view duration is estimated minutes (`duration × 0.45`), not measured retention. The L1 note and JSON metadata disclose this.

## Read-only web app

Deploy as yourself, access **Anyone** (approved for these already-public columns). `doGet` exposes only the 13 named columns, schema version, sync time, and estimation metadata. It never calls the updater or exposes credentials/properties. There is no `doPost`.

After editing `Code.gs`, save the bound script and update the existing web app deployment to a **new version** so its URL remains stable. Saving alone updates the time-trigger code but does not update a versioned web app. Keep `src/data/sheetSource.ts` aligned if a new deployment URL is created.

Validate with `npm run sync:youtube` and `npm run validate:data`. The daily GitHub snapshot workflow is only a fallback cache; it is not the browser's primary data path.

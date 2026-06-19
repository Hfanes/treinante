# Settings Reference

This file explains what each profile setting does in the app. Stored units stay canonical so imported data and calculations do not mix metric and imperial values.

## Units

- Field: `unit_preference`
- Values: `metric`, `imperial`
- Used for: settings display and input labels.
- Storage: distances still stay in kilometers; pace still stays in seconds per kilometer.

When imperial is selected, settings converts miles to kilometers before saving and converts threshold pace from seconds per mile to seconds per kilometer.

## Weekly Goal

- Field: `weekly_km_goal`
- Used for: dashboard weekly progress and reports.
- Storage: kilometers, even if the user enters miles.

## Max HR

- Field: `max_hr`
- Used for: HR-based run zones and training load when `hr_zone_method` is `max_hr`, or as a fallback when LTHR is missing.

Max HR zones use average run HR divided by max HR:

- `< 81%` = Z2
- `81-90%` = Z3
- `>= 90%` = Z4

Example: average HR `150`, max HR `190`, ratio `79%`, zone `Z2`.

## LTHR

- Field: `lthr`
- Meaning: lactate threshold heart rate.
- Used for: HR-based run zones and training load when `hr_zone_method` is `lthr`, or as a fallback when Max HR is missing.

LTHR zones use average run HR divided by LTHR:

- `< 89%` = Z2
- `89-93%` = Z3
- `>= 93%` = Z4

Example: average HR `155`, LTHR `170`, ratio `91%`, zone `Z3`.

## HR Zone Method

- Field: `hr_zone_method`
- Values: `max_hr`, `lthr`
- Used for: choosing the primary HR setting when both Max HR and LTHR are set.

Fallback order:

- If method is `lthr`: use LTHR, then Max HR, then threshold pace.
- If method is `max_hr`: use Max HR, then LTHR, then threshold pace.
- If neither HR method can be used: use threshold pace.
- If threshold pace is also missing: no zone badge is shown.

## Resting HR

- Field: `resting_hr`
- Used for: VO2max estimate in the predictor.
- Not used for run zone badges.

## Threshold Pace

- Field: `ftp_pace`
- Meaning: functional threshold pace.
- Used for: pace-based run zones when HR zones cannot be calculated.
- Storage: seconds per kilometer.

Threshold pace zones compare average run pace to threshold pace:

- More than `30 sec/km` slower than threshold = Z2
- Within `+/- 30 sec/km` of threshold = Z3
- More than `30 sec/km` faster than threshold = Z4

Example with threshold pace `5:00 /km`:

- Run at `5:45 /km` = Z2
- Run at `5:15 /km` = Z3
- Run at `4:20 /km` = Z4

## Strava Data

Strava imports provide run facts. Settings explain what those facts mean for the athlete.

- Strava distance is imported in meters and stored as kilometers.
- Strava average HR becomes run `avg_hr`.
- Strava max HR becomes run `max_hr`, but zone badges use profile Max HR or LTHR, not per-run max HR.
- Strava average watts and max watts are stored, but not used for zones yet.
- Run average pace is calculated from moving time and distance.

## Missing Settings

If no Max HR, LTHR, or threshold pace is set:

- Runs still import.
- Distance, pace, time, elevation, and records still work.
- Zone badges are hidden.
- Training load uses a generic intensity fallback of `0.75`.

Power zones and editable VO2max are intentionally not profile settings yet because current app features do not consume them.

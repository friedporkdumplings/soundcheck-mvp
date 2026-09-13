# Soundcheck Contracts

## Event

`{ artist, tour, name, date, time, venue, address, sourceUrl, sourceStatus }`

## Venue

`{ name, rules: string[], sourceStatus }`

## State components

`LoadingState`, `ErrorState`, `EmptyState`, and `SectionBadge`.

## Source methods

`loadEvent(url)`, `loadVenueRules()`, `loadWeather()`, `loadCommunityContext()`, and `loadSetlistHistory()`.

## DO NOT CHANGE WITHOUT ASKING

Do not change the Event or Venue shapes, state component names, or source method names without asking first.

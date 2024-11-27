# CHANGELOG

## Version 4.4.3

### Fixes
- Command Stacking

## Version 4.4.2

### New features
- `holdFlush` : allows stacking multiple graphic operations and displaying them simultaneously without screen flickering.
  
### Fixes
- image conversion to gray level
  
## Version 4.4.1

### Fixes
- Remove recursive call to avoid stackoverflow

## Version 4.4.0

### Breaking changes
- Use an anonymous function to accept update
  
### New features
- New commands :
  - `layoutClearAndDisplayExtended` : clear a layout before displaying it at a position
  - `layoutClearAndDisplay` : clear a layout before displaying it
  - `layoutClearExtended` : clear a layout at a position
  - `pageClearAndDisplay` : clear a page before displaying it
  - `imgSave` : save image in new format
  - `streamImg` : display an image without saving it
  - `polyline` : choose the thickness of your polyline

## Version 4.2.5

### New features
- Auto reconnect on BLE activation
- Fine grained configuration update
- Set default configuration on connection
- Display update ongoing layout on configuration update

### Fixes
- Clear glasses screen before and after configuration update
- Ensure glasses empty cmd stack on connection
    - Workaround before FW patch
    - Trigger a Flow Control CMD ERROR before first command
    - Start configuration update on this Flow Control CMD ERROR
- minor linter fixes

## Version 4.2.4.1

### Fixes
- Api path for retrieving firmware and configuration
- NullPointerException in web request

## Version 4.2.4

### New features
- Add a callback in the SDK init for triggering the glasses update.

### Changes
- Forbid glasses usage if the token is not valid
- Disable glasses update if battery under 10%

### Fixes
- fix inconsistent connection state while updating

## Version 4.2.3

### New features
- add a failure callback for updating errors
- add an up to date state for updates
- Allow cancelling connection
- Add a serialized glasses object allowing reconnecting without scanning

### Changes
- make update progress a double
- update dependencies
- On connection lost, directly trigger the disconnected glasses callback

## Version 4.2.2

### New features
- Include firmware update
    - get latest firmware from repository
- Include configuration update
    - get latest configuration from repository

### Fixes
- fix bad types.
- fix pages command id & byte typing
- fix version check for compatibility
- fix blocking api unavailability
- fix config update progress
- fix suota synchronization
- fix writting on characteristics twice
- fix BLE scan permission
- fix command unstacking
- fix flow control after 1000ms
- fix disconnect on disconnected

## Version 4.0.0

### Add

- Initial import of the SDK compatible with the firmware 4.0.0

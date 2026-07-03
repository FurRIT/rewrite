# Routes

This document exists to document route planning during the planning phase of
development.

## Existing Routes

Listed here is every route in the legacy application, grouped by the controller
that they exist in.

|----------|--------|--------------------------------|---------------------------------------|
| Group    | Method | Route                          | Description                           |
|----------|--------|--------------------------------|---------------------------------------|
| user     | GET    | `/user`                        | Get the userpage of the current User. |
| .        | POST   | `/user/delete/:furRITUsername` | Attempt to delete the specified User. |
| .        | POST   | `/user/updateAvatar`           | Update the avatar of an active User.  |
| .        | POST   | `/user/updateUser`             | Update the active User.               |
| .        | GET    | `/user/:furRITUsername`        | Get the userpage for a User           |
|----------|--------|--------------------------------|---------------------------------------|
| index    | GET    | `/`                            | Get the home page.                    |
| .        | GET    | `/about`                       | Get the about page.                   |
| .        | GET    | `/login`                       | Get the login page.                   |
| .        | POST   | `/login`                       | Attempt to login                      |
| .        | GET    | `/logout`                      | End the login session.                |
| .        | GET    | `/forgotPassword`              | Get the forgot password page.         |
| .        | POST   | `/forgotPassword`              | Start forgot password process.        |
| .        | POST   | `/resetPassword`               | Finish a forgot password process.     |
| .        | GET    | `/ritMajors`                   | Get recognized RIT majors             |
| .        | GET    | `/privacy`                     | Get FurRIT privacy policy.            |
|----------|--------|--------------------------------|---------------------------------------|
| events   | POST   | `/events/partstat/:eventId`    | Update RSVPs for users.               |
| .        | GET    | `/events`                      | Get the events page.                  |
| .        | PUT    | `/events`                      | Search events.                        |
| .        | GET    | `/events/new`                  | Get the event creation page.          |
| .        | POST   | `/events/new`                  | Create a new event.                   |
| .        | GET    | `/events/id/:eventId`          | Get the page for an event.            |
| .        | POST   | `/events/id/:eventId`          | Update an existing event.             |
| .        | DELETE | `/events/delete/:eventId`      | Delete an existing event.             |
|----------|--------|--------------------------------|---------------------------------------|
| search   | GET    | `/search`                      | Get the search page.                  |
| .        | POST   | `/search`                      | Search app Users.                     |
|----------|--------|--------------------------------|---------------------------------------|
| register | GET    | `/register`                    | Get the register page.                |
| .        | GET    | `/register/sendConfirmation`   | Get the confirmation page.            |
| .        | POST   | `/register/sendConfirmation`   | Get the confirmation code page.       |
| .        | POST   | `/register/sendConfirmation`   | Generate a random verification code.  |
| .        | GET    | `/register/verifyConfirmation` | Get the verification page.            |
| .        | POST   | `/register/verifyConfirmation` | Verify confirmation code.             |
|----------|--------|--------------------------------|---------------------------------------|

Note that several of these routes return pages - routes in the legacy program
return pages and function as API routes with little distinction.

## Planned Routes

### Web Routes

All web routes will have the implicit shared prefix `/` - which is to say they
don't have a prefix at all.

The descriptions of each entry in the table is marked either LO (Logged Out),
LI (Logged In), or LA (Logged Any). These indicated whether or not each page is
accessible to only logged in users, only logged out users, or either logged out
users or logged in users (respectively).

|-----------|--------|--------------------|----------------------------------------------|
| Group     | Method | Route              | Description                                  |
|-----------|--------|--------------------|----------------------------------------------|
| statics   | GET    | `/`                | Get the root page. (LO)                      |
| .         | GET    | `/about`           | Get the about page. (LI)                     |
| .         | GET    | `/privacy-policy`  | Get the privacy policy page. (LA)            |
|-----------|--------|--------------------|----------------------------------------------|
| auths     | GET    | `/login`           | Get the login page. (LO)                     |
| .         | GET    | `/forgot-password` | Get the password reset page. (LO)            |
|-----------|--------|--------------------|----------------------------------------------|
| registers | GET    | `/register`        | Get the registration page. (LO)              |
| .         | GET    | `/register/verify` | Get the registration verification page. (LO) |
|-----------|--------|--------------------|----------------------------------------------|
| users     | GET    | `/users`           | Get the users listing page. (LI)             |
| .         | GET    | `/user/me`         | Get the current user's userpage. (LI)        |
| .         | GET    | `/user/{userId}`   | Get the provided user's userpage. (LI)       |
|-----------|--------|--------------------|----------------------------------------------|
| events    | GET    | `/events`          | Get the events listing page. (LI)            |
| .         | GET    | `/event/{eventId}` | Get an event information page. (LI)          |
|-----------|--------|--------------------|----------------------------------------------|

### API Routes

All API routes will have the implicit shared prefix `/api`.

|---------------|--------|-----------------------------------------|-----------------------------------------|
| Group         | Method | Route                                   | Description                             |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| sessions      | POST   | `/session`                              | Create a new User Session.              |
| .             | DELETE | `/session/self`                         | Logout by removing the Session.         |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| registrations | POST   | `/registration`                         | Create a new Registration.              |
| .             | POST   | `/registration/{registrationId}/verify` | Verify an existing Registration.        |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| infos         | GET    | `/degrees`                              | Get listing of RIT degrees.             |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| users         | GET    | `/users`                                | Get a listing of Users.                 |
| .             | GET    | `/user/me`                              | Get information about the request User. |
| .             | GET    | `/user/{userId}`                        | Get information about a User.           |
| .             | PATCH  | `/user/{userId}`                        | Update a User's information.            |
| .             | DELETE | `/user/{userId}`                        | Delete an existing User.                |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| events        | GET    | `/events`                               | Get a listing of Events.                |
| .             | GET    | `/event/{eventId}`                      | Get information about an Event.         |
| .             | PATCH  | `/event/{eventId}`                      | Update an Event's information.          |
| .             | DELETE | `/event/{eventId}`                      | Delete an existing Event.               |
|---------------|--------|-----------------------------------------|-----------------------------------------|
| rsvps         | GET    | `/event/{eventId}/rsvps`                | Get a listing of Event RSVPs.           |
| .             | GET    | `/event/{eventId}/rsvp/me`              | Get the request User's RSVP.            |
| .             | PUT    | `/event/{eventId}/rsvp/me`              | Update/Create the request User's RSVP.  |
| .             | DELETE | `/event/{eventId}/rsvp/me`              | Delete the request User's RSVP.         |
|---------------|--------|-----------------------------------------|-----------------------------------------|

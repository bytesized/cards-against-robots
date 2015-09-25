# cards-against-robots

This is a Node.js implementation of Cards Against Humanity&trade; designed to be easy to configure. Currently, the only tested deployment mechanism is via Microsoft Azure.

As Cards Against Humanity&trade; uses the [Creative Commons BY-NC-SA 2.0 license](https://creativecommons.org/licenses/by-nc-sa/2.0/), this game also falls under the [Creative Commons BY-NC-SA 2.0 license](https://creativecommons.org/licenses/by-nc-sa/2.0/).

### Known Bugs/Planned Future Development
- Create game features a "Redraws" field which currently does nothing. Eventually this will provide each user with the ability discard their hand and redraw the same number of new cards.
- Deck Editor currently allows adding cards in the most basic manner only. Extensive expansions of the the deck editor system are planned.
- Card usage and win/loss statistics are currently unimplemented.
- Join Game page is currently static and must be refreshed manually to see new games.
- Invitations are not currently functional. Do not configure a site that requires invitations.
- Host of the room cannot change the room settings after the room has been created.
- There is currently no method of adding decks that are not standard decks or decks belonging to the host.
- Ability to favorite decks has not yet been implemented.
- Memory of decks used in last game may be added so the host does not have to select their favorite decks every time
- Players waiting to join a room (while a game is in progress in that room) currently cannot see the game in progress. This may be changed.
- Currently, the only mechanism of skipping idle users if they, for example, are away from their keyboard, is to wait for the room to kick them out (by default, this takes 10 minutes). This may be fixed by allowing an optional timer to skip players that have not played after a certain period and/or allowing the host to kick users during the game.
- The card quantity field currently does nothing. All cards will show up in the deck exactly one regardless of the quantity.
- Currently, the only way of making an announcement to the players is to edit the main page's source manually. Eventually, two mechanisms may be implemented, one where an announcement can be set that will be displayed on the main page, another where an announcement can be made into all chat rooms.
- There is currently no password recovery mechanism.
- There is currently no way to change password
- Currently, the standard decks are automatically added to the list of decks to play with in the "Create Game" page. The only way to change what decks are added like this is to manually edit configuration file. 
- There is currently no way (other than manual SQL commands) to lock users, delete users, and promote/demote users to/from Administrator.
- Room data is currently stored in memory. This needs to be changed to be stored in the database

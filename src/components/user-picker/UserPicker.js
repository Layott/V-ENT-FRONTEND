'use client';

import NamePicker from '@/components/name-picker/NamePicker';

// Choosing a person, rather than spelling their handle from memory.
//
// CEO, 4 September 2026, with a screenshot of the organisation invite form:
// "it sould be showing people with usernames closest to that on the platform,
// same for other places on the website that require you to input username and
// their profile images."
//
// Since 8 October 2026 (inbox 416) the field itself lives in NamePicker, which
// also picks teams and organisations; this is its person form, kept so the
// places already using it read the same. `purpose="message"` honours
// allow_direct_messages: somebody who has switched messages off is listed and
// not selectable.

const UserPicker = (props) => <NamePicker {...props} kind="user" />;

export default UserPicker;

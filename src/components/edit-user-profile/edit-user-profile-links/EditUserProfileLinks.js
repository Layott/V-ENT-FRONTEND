import { useState, useEffect } from 'react';
import { HiPlus } from "react-icons/hi";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import editUserProfileDetailsStyles from './../edit-user-profile-info/edit-user-profile-details/edit-user-profile-details.module.css';
import styles from './edit-user-profile-links.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import CircularProgress from '@mui/material/CircularProgress';

const EditUserProfileLinks = () => {
  const { data: session, status } = useSession();
  const [links, setLinks] = useState([{ title: '', link: '' }]);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const router = useRouter();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Fetch user information and populate form
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (status !== "authenticated" || !session?.user?.sessionToken) {
        console.log('Not authenticated or no session token');
        return;
      }

      console.log('Fetching user info with token:', session.user.sessionToken);
      console.log('Base URL:', baseUrl);

      try {
        const response = await fetch(`${baseUrl}/auth/get-user-informations/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.user.sessionToken}`,
          },
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('Full API response:', result);
          
          const userData = result.data;
          console.log('User data:', userData);
          console.log('Social links:', userData.social_links);
          
          // Populate social media fields
          if (userData.social_links && Array.isArray(userData.social_links)) {
            const reservedTitles = ['facebook', 'twitter', 'instagram', 'youtube'];
            const dynamicLinks = [];

            userData.social_links.forEach((linkObj) => {
              const title = linkObj.title.toLowerCase();
              const url = linkObj.url;

              console.log(`Processing link: ${title} = ${url}`);

              if (title === 'facebook') {
                console.log('Setting facebook:', url);
                setFacebook(url);
              } else if (title === 'twitter') {
                console.log('Setting twitter:', url);
                setTwitter(url);
              } else if (title === 'instagram') {
                console.log('Setting instagram:', url);
                setInstagram(url);
              } else if (title === 'youtube') {
                console.log('Setting youtube:', url);
                setYoutube(url);
              } else {
                // Add to dynamic links if it's not a reserved title
                console.log('Adding to dynamic links:', linkObj.title, url);
                dynamicLinks.push({ title: linkObj.title, link: url });
              }
            });

            // Set dynamic links if there are any, otherwise keep default empty link
            if (dynamicLinks.length > 0) {
              console.log('Setting dynamic links:', dynamicLinks);
              setLinks(dynamicLinks);
            }
          } else {
            console.log('No social_links found or not an array');
          }
        } else {
          console.log('Response not ok:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching user information:', error);
      }
    };

    fetchUserInfo();
  }, [session, status, baseUrl]);

  const handleAddLink = () => {
    setLinks([...links, { title: '', link: '' }]);
  };

  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...links];
    updatedLinks[index][field] = value;
    setLinks(updatedLinks);
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('=== DEBUGGING START ===');
    console.log('Current state values:', {
      facebook,
      twitter, 
      instagram,
      youtube
    });
    console.log('Dynamic links array:', links);
    
    try {
      if (!session?.user?.sessionToken) {
        setSnackbarMessage('Session token is missing. Please log in again.');
        setSnackbarType('error');
        setOpen(true);
        setLoading(false);
        return;
      }

      // Start with empty object
      const formattedLinks = {};
      const reservedTitles = ['facebook', 'twitter', 'instagram', 'youtube'];
      
      // Check for reserved titles in dynamic links and show error if found
      const invalidLinks = links.filter(link => 
        link.title && link.title.trim() && reservedTitles.includes(link.title.toLowerCase().trim())
      );
      
      if (invalidLinks.length > 0) {
        console.log('Found invalid links:', invalidLinks);
        setSnackbarMessage('Please use the dedicated fields for Facebook, Twitter, Instagram, and YouTube instead of adding them as custom links.');
        setSnackbarType('error');
        setOpen(true);
        setLoading(false);
        return;
      }
      
      // Add predefined social media links if they have values
      if (facebook && facebook.trim()) {
        formattedLinks.facebook = facebook.trim();
        console.log('Added facebook:', facebook.trim());
      }
      if (twitter && twitter.trim()) {
        formattedLinks.twitter = twitter.trim();
        console.log('Added twitter:', twitter.trim());
      }
      if (instagram && instagram.trim()) {
        formattedLinks.instagram = instagram.trim();
        console.log('Added instagram:', instagram.trim());
      }
      if (youtube && youtube.trim()) {
        formattedLinks.youtube = youtube.trim();
        console.log('Added youtube:', youtube.trim());
      }
      
      // Add dynamic links (filter out empty ones and reserved titles)
      links.forEach((link, index) => {
        if (link.title && link.title.trim() && link.link && link.link.trim()) {
          const trimmedTitle = link.title.trim();
          const trimmedLink = link.link.trim();
          
          // Double check it's not a reserved title
          if (!reservedTitles.includes(trimmedTitle.toLowerCase())) {
            formattedLinks[trimmedTitle] = trimmedLink;
            console.log(`Added dynamic link ${index}:`, trimmedTitle, '=', trimmedLink);
          } else {
            console.log(`Skipped reserved title at index ${index}:`, trimmedTitle);
          }
        }
      });

      console.log('=== FINAL FORMATTED LINKS ===');
      console.log('Keys in formattedLinks:', Object.keys(formattedLinks));
      console.log('Full formattedLinks object:', formattedLinks);
      
      // Check for any duplicate keys (this shouldn't happen, but let's be sure)
      const keys = Object.keys(formattedLinks);
      const uniqueKeys = [...new Set(keys)];
      if (keys.length !== uniqueKeys.length) {
        console.error('DUPLICATE KEYS DETECTED IN FRONTEND!');
        console.error('Keys:', keys);
        console.error('Unique keys:', uniqueKeys);
      }

      const payload = { links: formattedLinks };
      console.log('=== PAYLOAD BEING SENT ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(VENT.EDIT_LINKS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('=== RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (response.ok) {
        setLinks([{ title: '', link: '' }]);
        router.push('/user-profile');
        setSnackbarMessage(data.message || 'Links updated successfully!');
        setSnackbarType('success');
      } else {
        setSnackbarMessage(data.message || 'Failed to update links.');
        setSnackbarType('error');
      }
      setOpen(true);
    } catch (error) {
      console.error('Error updating links:', error);
      setSnackbarMessage('An error occurred while updating your links.');
      setSnackbarType('error');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editLinksContainer}>
      <h3>Web and Social Links</h3>

      <form onSubmit={handleSubmit}>
        <div className={editUserProfileDetailsStyles.profileDetailsContainer}>
          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="facebook">Facebook</label>
            <input id="facebook" type="text" placeholder="https://www.facebook.com" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="twitter">X (Twitter)</label>
            <input id="twitter" type="text" placeholder="https://www.x.com" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="instagram">Instagram</label>
            <input id="instagram" type="text" placeholder="https://www.instagram.com" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="youtube">YouTube</label>
            <input id="youtube" type="text" placeholder="https://www.youtube.com" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
          </div>

          {links.map((link, index) => (
            <div className={styles.titleLinkContainer} key={index}>
              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`title-${index}`}>Title</label>
                <input
                  id={`title-${index}`}
                  type="text"
                  placeholder="e.g. YouTube, Instagram"
                  value={link.title}
                  onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                />
                
              </div>

              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`link-${index}`}>Link</label>
                <input
                  id={`link-${index}`}
                  type="text"
                  placeholder="https://www.youtube.com"
                  value={link.link}
                  onChange={(e) => handleLinkChange(index, 'link', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button className={styles.addAnotherLink} type="button" onClick={handleAddLink}>
            <HiPlus className={styles.addLinkIcon} /> Add another link
          </button>
        </div>

        <div className={styles.buttonContainer}>
          <button className={`btn redBTN ${styles.resendBTN}`} type="submit" disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Changes'}
          </button>
        </div>
      </form>

      <MessageSnackbar
        open={open}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  );
};

export default EditUserProfileLinks;
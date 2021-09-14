exports.onExecutePostLogin = async (event, api) => {

 /*  Set 'clientId' below to the client ID of the Salesforce connected app registered for Auth0 synchronization.
  *  Register new secrets in the Auth0 action named 'sf_client_secret' and 'sf_refresh_token' for the client secret and refresh token respecively.
  *  Set 'contactCustomIdField' to the name of the custom extension ID field registered on the Contact object in Salesforce.
  *  Optionally edit 'contactFieldMap' to map the Auth0 user fields to Contact user fields
  *  Optionally edit 'authEventTypeRegex' to set what type of user authentication protocol transaction must occur for the contact info to sync
  *     For a list of supported protocol transaction strings, see docs on event.transaction.protocol here: 
  *     https://auth0.com/docs/actions/triggers/post-login/event-object
  */
    const clientId = 'xxxxxxxxxxxx';
    const clientSecret = event.secrets.sf_client_secret;
    const refreshToken = event.secrets.sf_refresh_token;
    const contactCustomIdField = 'scip_id__c';
    const contactFieldMap = {
        'Email': event.user.email,
        'FirstName': event.user.given_name,
        'LastName': event.user.family_name,
        'Description': 'Contact info synced from Auth0 for ' + event.user.name,
        //Fields below may be mapped from custom Auth0 user metadata
        //'Title': 
        //'Department': 
        //'Phone': 
        //'MobilePhone': 
        //'HomePhone': 
        //'OtherPhone': 
        //'Fax':
        //'MailingStreet':
        //'MailingCity':
        //'MailingState':
        //'MailingPostalCode':
        //'MailingCountry':
        //'Salutation':
        //'Birthdate':
        //'LeadSource':
    };
    const authEventTypeRegex = /^(oidc-basic-profile|oidc-implicit-profile|oauth2-resource-owner)$/;

 /*
  * ==== Action starts below ====
  */
 
    console.log('Sync contact info to Salesforce action start');
    const transaction = event.transaction || {};
    const loginType = transaction.protocol || '';
    const userAppMetadata = event.user.app_metadata || {};
    var userScipContactId  = userAppMetadata.scip_contact_id;
    if (loginType.match(authEventTypeRegex)) {
        const axios = require('axios');
        try {
            const tokenRequest = await axios({
                method: 'post',
                url: 'https://login.salesforce.com/services/oauth2/token',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
                responseType: 'json',
                data: { 
                    grant_type: 'refresh_token',
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken
                    },
                transformRequest: function(data, headers) { return Object.entries(data)
                        .map(x => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`)
                        .join('&');
                    }
                });

                const tokenResponse = tokenRequest.data;
                console.log(tokenResponse);
                if (!tokenResponse && !tokenResponse.access_token) {
                    console.log('Error: Salesforce access token missing');
                } else {
                    const apiRequest = await axios({
                        method: 'patch',
                        url: 'https://na1.salesforce.com/services/data/v51.0/sobjects/Contact/' + contactCustomIdField + '/' + event.user.user_id,
                        headers: {
                            'authorization': 'Bearer ' + tokenResponse.access_token,
                            'content-type': 'application/json'
                        },
                        responseType: 'json',
                        data: contactFieldMap
                        });
                        
                const apiResponse = apiRequest.data;
                console.log(apiResponse);
                if (apiResponse && apiResponse.id !== userScipContactId) {
                    console.log('Salesforce contact ID added to Auth0 user profile: ' + apiResponse.id);
                    api.user.setAppMetadata('scip_contact_id', apiResponse.id);
                }
            }
        } catch(error) {
            console.error(error);
        }
    }
    console.log('Sync contact info to Salesforce action completed');
};

package retransmiter

import (
	"github.com/iMDT/bbb-graphql-middleware/internal/common"
	log "github.com/sirupsen/logrus"
)

func RetransmitSubscriptionStartMessages(hc *common.HasuraConnection, fromBrowserToHasuraChannel *common.SafeChannel) {
	log := log.WithField("_routine", "RetransmitSubscriptionStartMessages").WithField("browserConnectionId", hc.Browserconn.Id).WithField("hasuraConnectionId", hc.Id)

	hc.Browserconn.ActiveSubscriptionsMutex.RLock()
	for _, subscription := range hc.Browserconn.ActiveSubscriptions {
		if subscription.LastSeenOnHasuraConnetion != hc.Id {

			log.Tracef("retransmiting subscription start: %v", subscription.Message)

			if subscription.Type == common.Streaming && subscription.StreamCursorCurrValue != nil {
				fromBrowserToHasuraChannel.Send(common.PatchQuerySettingLastCursorValue(subscription))
			} else {
				fromBrowserToHasuraChannel.Send(subscription.Message)
			}
		}
	}
	hc.Browserconn.ActiveSubscriptionsMutex.RUnlock()
}
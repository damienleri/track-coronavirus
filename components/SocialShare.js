import React, { Component } from "react";
import { Share, Button } from "react-native";
import Link from "./Link";

export default class SocialShare extends Component {
  onShare = async () => {
    try {
      const result = await Share.share({
        title: "Track coronavirus",
        message:
          "An app for iOS and Android for tracking coronavirus across the world and in your area. http://trackavirus.com",
        url: "http://www.trackavirus.com"
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      alert(error.message);
    }
  };

  render() {
    // return <Button onPress={this.onShare} title="Share with a friend" />;
    return (
      <Link
        onPress={this.onShare}
        style={{ fontSize: 16, marginTop: 8, textTransform: "uppercase" }}
      >
        Share this with a friend
      </Link>
    );
  }
}

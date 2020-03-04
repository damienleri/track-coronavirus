import React from "react";
import { Text, StyleSheet } from "react-native";
import { Linking, WebBrowser } from "expo";

export default class Anchor extends React.Component {
  _handlePress = () => {
    Linking.openURL(this.props.href);
    // WebBrowser.openBrowserAsync(this.props.href);
    this.props.onPress && this.props.onPress();
  };

  render() {
    return (
      <Text style={[styles.text, this.props.style]} onPress={this._handlePress}>
        {this.props.children}
      </Text>
    );
  }
}

// <Link href="https://google.com">Go to Google</Link>
// <Link href="mailto:support@expo.io">Email support</Link>
const styles = StyleSheet.create({
  text: { color: "steelblue", fontWeight: "600" }
});

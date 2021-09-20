import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui"; 

import { makeStyles } from "@material-ui/core/styles";
import { Typography } from '@material-ui/core';
import { StyleSheet, Text, View } from "react-native";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { Grid } from '@material-ui/core';
import { Breadcrumbs, Link } from "@material-ui/core";

import logo from './../src/logo.png'
import { Image } from "@material-ui/icons";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";
import { CenterFocusStrong } from "@material-ui/icons";
import { minHeight } from "@mui/system";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

var tempRemaining = 0;
var tempAvailable = 0;

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const [alignment, setAlignment] = useState("");

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;

      const { candyMachine, goLiveDate, itemsRemaining, itemsAvailable } =
        await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection
        );

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
      tempAvailable = itemsAvailable;
      tempRemaining = itemsRemaining;
      
    })();
  }, [wallet, props.candyMachineId, props.connection]);

  const styles = StyleSheet.create({
    container: {
      paddingTop: 50,
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    header: {
      
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    tinyLogo: {
      width: 50,
      height: 50,
    },
    logo: {
      width: 66,
      height: 58,
    },
  });

  const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1
    },
  
    paper: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary
    },
    custom: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary,
      
    }
  
  }));

  
const classes = useStyles();

  return (
    <main>
      <div className={classes.root}>
        <Grid item xs={12}>
          <Paper className={classes.custom}>

            <View style={styles.header}>
              <img style={{ height: 50, width: 50 }} src={logo} />

              <Breadcrumbs aria-label="breadcrumb">
                <Link underline="hover" color="inherit" href="/">
                  Home
                </Link>
                <Link
                  underline="hover"
                  color="inherit"
                  href="/gallery"
                >
                  Gallery
                </Link>
                <Typography color="primary">About</Typography>
              </Breadcrumbs>

            </View>
          </Paper>
        </Grid>
      </div>

      <div style={{
        backgroundImage: `url(${process.env.PUBLIC_URL + "/assets/bg.jpg"})`,
        backgroundSize: "cover",
        height: '100%',
        width: '100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: "center"
      }}>

        <div className={classes.root}>
          <Grid container
            direction="column"
            justify="center"
            alignItems="center"
            style={{ minHeight: "100vh" }}
            spacing={3}
          >
            <Grid item xs={6}>
              <Paper className={classes.paper}>
                {wallet.connected && (
                  <Typography>
                    <h3>Address: {shortenAddress(wallet.publicKey?.toBase58() || "")}</h3>
                  </Typography>
                )}

                {wallet.connected && (
                  <Typography>
                    <h3>Balance: {(balance || 0).toLocaleString()} SOL</h3>
                  </Typography>
                )}

                {wallet.connected && (
                  <Typography>
                    <h3>Remaining: {(tempRemaining || 0).toLocaleString()} / {(tempAvailable || 0).toLocaleString()}</h3>
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={6}>
              <MintContainer>
                {!wallet.connected ? (
                  <ConnectButton>Connect Wallet</ConnectButton>
                ) : (
                  <MintButton
                    disabled={isSoldOut || isMinting || !isActive}
                    onClick={onMint}
                    variant="contained"
                  >
                    {isSoldOut ? (
                      "SOLD OUT"
                    ) : isActive ? (
                      isMinting ? (
                        <CircularProgress />
                      ) : (
                        "MINT FOR 1 SOL"
                      )
                    ) : (
                      <Countdown
                        date={startDate}
                        onMount={({ completed }) => completed && setIsActive(true)}
                        onComplete={() => setIsActive(true)}
                        renderer={renderCounter}
                      />
                    )}
                  </MintButton>
                )}
              </MintContainer>
            </Grid>
          </Grid>
        </div>

        <Snackbar
          open={alertState.open}
          autoHideDuration={6000}
          onClose={() => setAlertState({ ...alertState, open: false })}
        >
          <Alert
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
          >
            {alertState.message}
          </Alert>
        </Snackbar>

      </div>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;

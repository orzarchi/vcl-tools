  if (Activate_REAR_Piston = 0)
  {Driver_12_Command = 0}
  else
  {Driver_12_Command = cPWM_Output}

autouser286 = autouser286 + 1

  if (Activate_Switch = 0);
  {Digital_Out_3_Command = 0}
  else
  {Digital_Out_3_Command = 1}

       if (Get_Received_Status(TestMessage) = 0)
         {Return}

         Clear_Received_Status(TestMessage)

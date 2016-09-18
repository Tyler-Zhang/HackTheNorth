package com.kosalgeek.android.uploadimagetoserver;

import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface RestService {

    @POST("update")
    Call<Void> postPhoto(@Body RequestBody file);

}